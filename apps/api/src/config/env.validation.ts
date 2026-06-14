import { z } from 'zod';

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(3001),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string().min(1),
  DATABASE_PROVIDER: z.enum(['postgresql', 'mysql', 'sqlite']).default('postgresql'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('noreply@hop.local'),

  // Encryption
  ENCRYPTION_KEY: z.string().min(32),

  // Rate limiting
  THROTTLE_TTL: z.coerce.number().default(60),
  THROTTLE_LIMIT: z.coerce.number().default(100),

  // Seed
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(8).optional(),
  SEED_ADMIN_FIRSTNAME: z.string().default('Super'),
  SEED_ADMIN_LASTNAME: z.string().default('Admin'),

  // Currency
  DEFAULT_CURRENCY: z.string().default('USD'),
  EXCHANGE_RATE_API_KEY: z.string().optional(),

  // Plugins
  DEFAULT_PLUGIN_TRUST_LEVEL: z.enum(['trusted', 'sandboxed']).default('sandboxed'),
});

export type Env = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const errors = parsed.error.format();
    console.error('❌ Invalid environment variables:', JSON.stringify(errors, null, 2));
    throw new Error('Invalid environment variables — check .env file');
  }
  return parsed.data;
}
