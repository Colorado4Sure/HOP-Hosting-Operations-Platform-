import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { JwtPayload, UserRole, Permission } from '@hop/shared-types';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
  ) {}

  // ─── Validate credentials ─────────────────────────────────────────────────
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  // ─── Register ─────────────────────────────────────────────────────────────
  async register(dto: RegisterDto, ipAddress?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await argon2.hash(dto.password);
    const emailVerifyToken = uuidv4();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: 'Client',
        emailVerifyToken,
      },
    });

    // Create linked client profile
    await this.prisma.client.create({
      data: {
        userId: user.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        companyName: dto.companyName,
        email: dto.email,
        phone: dto.phone,
      },
    });

    // Send welcome + verification email (fire-and-forget)
    this.notificationsService
      .sendEmail('email-verification', user.email, {
        first_name: user.firstName,
        verify_link: `${this.configService.get('FRONTEND_URL')}/auth/verify-email?token=${emailVerifyToken}`,
      })
      .catch(() => {});

    await this.auditService.log({
      userId: user.id,
      action: 'register',
      resource: 'user',
      resourceId: user.id,
      ipAddress,
    });

    return { message: 'Registration successful. Please verify your email.' };
  }

  // ─── Login ────────────────────────────────────────────────────────────────
  async login(user: { id: string; role: UserRole; customPermissions: string[]; twoFactorEnabled: boolean }, ipAddress?: string) {
    if (user.twoFactorEnabled) {
      // Return a temporary token indicating 2FA is required
      return { requiresTwoFactor: true, userId: user.id };
    }

    const tokens = await this.generateTokens(user.id, user.role, user.customPermissions as Permission[], ipAddress);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'login',
      resource: 'user',
      resourceId: user.id,
      ipAddress,
    });

    const fullUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });

    return {
      user: this.sanitizeUser(fullUser),
      tokens,
    };
  }

  // ─── Refresh Token ────────────────────────────────────────────────────────
  async refreshTokens(dto: RefreshTokenDto, ipAddress?: string) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { token: dto.refreshToken } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: stored.userId } });
    if (!user.isActive) throw new UnauthorizedException('Account inactive');

    // Rotate: revoke old token
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens(user.id, user.role as UserRole, user.customPermissions as Permission[], ipAddress);
  }

  // ─── Logout ───────────────────────────────────────────────────────────────
  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revokedAt: new Date() },
    });
    return { message: 'Logged out' };
  }

  // ─── 2FA Setup ────────────────────────────────────────────────────────────
  async setup2FA(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, 'HOP', secret);
    const qrCodeUrl = await qrcode.toDataURL(otpauth);
    const backupCodes = Array.from({ length: 10 }, () =>
      Math.random().toString(36).substring(2, 10).toUpperCase(),
    );

    // Temporarily store secret — confirmed on verify
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret, twoFactorBackupCodes: backupCodes },
    });

    return { secret, qrCodeUrl, backupCodes };
  }

  // ─── 2FA Verify + Enable ─────────────────────────────────────────────────
  async verify2FA(userId: string, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.twoFactorSecret) throw new BadRequestException('2FA not set up');

    const valid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
    if (!valid) throw new UnauthorizedException('Invalid 2FA code');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return { message: '2FA enabled successfully' };
  }

  // ─── Disable 2FA ─────────────────────────────────────────────────────────
  async disable2FA(userId: string, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.twoFactorSecret) throw new BadRequestException('2FA not enabled');

    const valid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
    if (!valid) throw new UnauthorizedException('Invalid 2FA code');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: [] },
    });

    return { message: '2FA disabled' };
  }

  // ─── Email Verification ───────────────────────────────────────────────────
  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({ where: { emailVerifyToken: token } });
    if (!user) throw new BadRequestException('Invalid or expired verification token');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerifyToken: null },
    });

    return { message: 'Email verified successfully' };
  }

  // ─── Forgot Password ──────────────────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Always return success to prevent email enumeration
    if (!user) return { message: 'If that email exists, a reset link has been sent' };

    const token = uuidv4();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpires: expires },
    });

    this.notificationsService
      .sendEmail('password-reset', user.email, {
        first_name: user.firstName,
        reset_link: `${this.configService.get('FRONTEND_URL')}/auth/reset-password?token=${token}`,
      })
      .catch(() => {});

    return { message: 'If that email exists, a reset link has been sent' };
  }

  // ─── Reset Password ───────────────────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: dto.token,
        passwordResetExpires: { gt: new Date() },
      },
    });
    if (!user) throw new BadRequestException('Invalid or expired reset token');

    const passwordHash = await argon2.hash(dto.password);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordResetToken: null, passwordResetExpires: null },
    });

    // Revoke all refresh tokens for security
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { revokedAt: new Date() },
    });

    return { message: 'Password reset successful' };
  }

  // ─── Change Password ──────────────────────────────────────────────────────
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const passwordHash = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    return { message: 'Password changed successfully' };
  }

  // ─── Get Current User ─────────────────────────────────────────────────────
  async getMe(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.sanitizeUser(user);
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────
  private async generateTokens(userId: string, role: UserRole, permissions: Permission[], ipAddress?: string) {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: userId,
      email: (await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } })).email,
      role,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshTokenValue = uuidv4();
    const refreshExpiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d');
    const expiresAt = new Date(Date.now() + this.parseDuration(refreshExpiresIn));

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshTokenValue,
        expiresAt,
        ipAddress,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: this.parseDuration(this.configService.get('JWT_EXPIRES_IN', '15m')) / 1000,
    };
  }

  private sanitizeUser(user: { id: string; email: string; firstName: string; lastName: string; role: string; customPermissions: string[]; twoFactorEnabled: boolean; isEmailVerified: boolean; isActive: boolean; lastLoginAt: Date | null; createdAt: Date; updatedAt: Date }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      customPermissions: user.customPermissions,
      twoFactorEnabled: user.twoFactorEnabled,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private parseDuration(duration: string): number {
    const unit = duration.slice(-1);
    const value = parseInt(duration.slice(0, -1), 10);
    const map: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return value * (map[unit] ?? 1000);
  }

  // ─── Admin: User Management ───────────────────────────────────────────────

  async listUsers(params: { page?: number; perPage?: number; search?: string; role?: string }) {
    const { page = 1, perPage = 25, search, role } = params;
    const skip = (Number(page) - 1) * Number(perPage);

    const where: any = {
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(perPage),
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, customPermissions: true, isActive: true,
          isEmailVerified: true, twoFactorEnabled: true,
          lastLoginAt: true, createdAt: true, updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        perPage: Number(perPage),
        totalPages: Math.ceil(total / Number(perPage)),
      },
    };
  }

  async updateUser(
    id: string,
    data: { role?: string; customPermissions?: string[]; isActive?: boolean },
    actorId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(data.role ? { role: data.role as any } : {}),
        ...(data.customPermissions !== undefined ? { customPermissions: data.customPermissions } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, customPermissions: true, isActive: true,
        isEmailVerified: true, createdAt: true, updatedAt: true,
      },
    });

    await this.auditService.log({
      userId: actorId,
      action: 'update-user',
      resource: 'user',
      resourceId: id,
      metadata: data,
    });

    return updated;
  }

  async deleteUser(id: string, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (id === actorId) throw new BadRequestException('Cannot delete your own account');

    await this.prisma.user.delete({ where: { id } });

    await this.auditService.log({
      userId: actorId,
      action: 'delete-user',
      resource: 'user',
      resourceId: id,
    });

    return { message: 'User deleted' };
  }
}
