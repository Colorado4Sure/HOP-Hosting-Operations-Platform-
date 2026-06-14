import type { UUID, ISODateString } from './common.types';

// ─── Auth & RBAC Types ────────────────────────────────────────────────────────

export type UserRole = 'SuperAdmin' | 'Admin' | 'Staff' | 'Reseller' | 'Client';

export type Permission =
  // Clients
  | 'clients:read'
  | 'clients:create'
  | 'clients:update'
  | 'clients:delete'
  // Invoices
  | 'invoices:read'
  | 'invoices:create'
  | 'invoices:update'
  | 'invoices:delete'
  | 'invoices:pay'
  // Products
  | 'products:read'
  | 'products:create'
  | 'products:update'
  | 'products:delete'
  // Servers
  | 'servers:read'
  | 'servers:provision'
  | 'servers:suspend'
  | 'servers:terminate'
  // Domains
  | 'domains:read'
  | 'domains:register'
  | 'domains:transfer'
  | 'domains:renew'
  // Support
  | 'support:read'
  | 'support:reply'
  | 'support:close'
  | 'support:assign'
  // Reports
  | 'reports:read'
  // Settings
  | 'settings:read'
  | 'settings:update'
  // Plugins
  | 'plugins:manage'
  // Affiliates
  | 'affiliates:read'
  | 'affiliates:manage';

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
