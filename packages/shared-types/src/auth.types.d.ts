import type { UUID, ISODateString } from './common.types';
export type UserRole = 'SuperAdmin' | 'Admin' | 'Staff' | 'Reseller' | 'Client';
export type Permission = 'clients:read' | 'clients:create' | 'clients:update' | 'clients:delete' | 'invoices:read' | 'invoices:create' | 'invoices:update' | 'invoices:delete' | 'invoices:pay' | 'products:read' | 'products:create' | 'products:update' | 'products:delete' | 'servers:read' | 'servers:provision' | 'servers:suspend' | 'servers:terminate' | 'domains:read' | 'domains:register' | 'domains:transfer' | 'domains:renew' | 'support:read' | 'support:reply' | 'support:close' | 'support:assign' | 'reports:read' | 'settings:read' | 'settings:update' | 'plugins:manage' | 'affiliates:read' | 'affiliates:manage';
export interface Role {
    id: UUID;
    name: string;
    description?: string;
    permissions: Permission[];
    isSystem: boolean;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}
export interface User {
    id: UUID;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    customPermissions?: Permission[];
    twoFactorEnabled: boolean;
    isEmailVerified: boolean;
    isActive: boolean;
    lastLoginAt?: ISODateString;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export interface LoginResponse {
    user: User;
    tokens: AuthTokens;
    requiresTwoFactor?: boolean;
}
export interface TwoFactorSetupResponse {
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
}
export interface JwtPayload {
    sub: UUID;
    email: string;
    role: UserRole;
    permissions: Permission[];
    iat: number;
    exp: number;
}
//# sourceMappingURL=auth.types.d.ts.map