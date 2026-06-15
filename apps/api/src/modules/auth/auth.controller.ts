import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Ip,
  Param,
  Patch,
  Query,
  Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  VerifyTwoFactorDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '@hop/shared-types';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new client account' })
  @UseGuards(ThrottlerGuard)
  @Post('register')
  register(@Body() dto: RegisterDto, @Ip() ip: string) {
    return this.authService.register(dto, ip);
  }

  @ApiOperation({ summary: 'Login with email and password' })
  @UseGuards(ThrottlerGuard, AuthGuard('local'))
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Request() req: any, @Ip() ip: string) {
    return this.authService.login(req.user, ip);
  }

  @ApiOperation({ summary: 'Refresh access token' })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto, @Ip() ip: string) {
    return this.authService.refreshTokens(dto, ip);
  }

  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiBearerAuth('JWT')
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMe(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub);
  }

  @ApiOperation({ summary: 'Verify email address' })
  @Get('verify-email/:token')
  verifyEmail(@Param('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @ApiOperation({ summary: 'Request password reset' })
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @ApiOperation({ summary: 'Reset password with token' })
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @ApiOperation({ summary: 'Change password (authenticated)' })
  @ApiBearerAuth('JWT')
  @UseGuards(AuthGuard('jwt'))
  @Patch('change-password')
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.sub, dto);
  }

  @ApiOperation({ summary: 'Setup 2FA — generate QR code' })
  @ApiBearerAuth('JWT')
  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/setup')
  setup2FA(@CurrentUser() user: JwtPayload) {
    return this.authService.setup2FA(user.sub);
  }

  @ApiOperation({ summary: 'Verify and enable 2FA' })
  @ApiBearerAuth('JWT')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @Post('2fa/verify')
  verify2FA(@CurrentUser() user: JwtPayload, @Body() dto: VerifyTwoFactorDto) {
    return this.authService.verify2FA(user.sub, dto.code);
  }

  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiBearerAuth('JWT')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @Post('2fa/disable')
  disable2FA(@CurrentUser() user: JwtPayload, @Body() dto: VerifyTwoFactorDto) {
    return this.authService.disable2FA(user.sub, dto.code);
  }

  // ─── Admin: User Management ──────────────────────────────────────────────

  @ApiOperation({ summary: 'List all users (admin)' })
  @ApiBearerAuth('JWT')
  @UseGuards(AuthGuard('jwt'))
  @Get('users')
  listUsers(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    return this.authService.listUsers({ page, perPage, search, role });
  }

  @ApiOperation({ summary: 'Update user role and permissions (admin)' })
  @ApiBearerAuth('JWT')
  @UseGuards(AuthGuard('jwt'))
  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() body: { role?: string; customPermissions?: string[]; isActive?: boolean },
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.authService.updateUser(id, body, actor.sub);
  }

  @ApiOperation({ summary: 'Delete a user (admin)' })
  @ApiBearerAuth('JWT')
  @UseGuards(AuthGuard('jwt'))
  @Delete('users/:id')
  deleteUser(@Param('id') id: string, @CurrentUser() actor: JwtPayload) {
    return this.authService.deleteUser(id, actor.sub);
  }
}
