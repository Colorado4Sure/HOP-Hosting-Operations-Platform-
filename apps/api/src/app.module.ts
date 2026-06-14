import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { validate } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClientsModule } from './modules/clients/clients.module';
import { BillingModule } from './modules/billing/billing.module';
import { ProductsModule } from './modules/products/products.module';
import { ServicesModule } from './modules/services/services.module';
import { PaymentModule } from './modules/payment/payment.module';
import { ProvisioningModule } from './modules/provisioning/provisioning.module';
import { DomainsModule } from './modules/domains/domains.module';
import { SupportModule } from './modules/support/support.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AffiliatesModule } from './modules/affiliates/affiliates.module';
import { PluginsModule } from './modules/plugins/plugins.module';
import { AutomationModule } from './modules/automation/automation.module';
import { SettingsModule } from './modules/settings/settings.module';
import { HealthModule } from './modules/health/health.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    // ─── Config ──────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: ['.env.local', '.env'],
    }),

    // ─── Structured Logging ───────────────────────────────────────────────────
    LoggerModule.forRootAsync({
      useFactory: () => ({
        pinoHttp: {
          level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
          transport:
            process.env.NODE_ENV !== 'production'
              ? { target: 'pino-pretty', options: { colorize: true } }
              : undefined,
          genReqId: () => crypto.randomUUID(),
          customProps: () => ({ context: 'HTTP' }),
        },
      }),
    }),

    // ─── Rate Limiting ────────────────────────────────────────────────────────
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    // ─── Job Scheduling ───────────────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ─── Core Infrastructure ──────────────────────────────────────────────────
    PrismaModule,
    RedisModule,

    // ─── Domain Modules ───────────────────────────────────────────────────────
    AuthModule,
    ClientsModule,
    BillingModule,
    ProductsModule,
    ServicesModule,
    PaymentModule,
    ProvisioningModule,
    DomainsModule,
    SupportModule,
    NotificationsModule,
    ReportsModule,
    AffiliatesModule,
    PluginsModule,
    AutomationModule,
    SettingsModule,
    HealthModule,
    AuditModule,
  ],
})
export class AppModule {}
