import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { Redis } from 'ioredis';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @ApiOperation({ summary: 'Basic health check' })
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @ApiOperation({ summary: 'Database health check' })
  @Get('db')
  async checkDb() {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', latency: Date.now() - start };
    } catch (err: any) {
      return { status: 'error', latency: Date.now() - start, message: err?.message };
    }
  }

  @ApiOperation({ summary: 'Redis / queue health check' })
  @Get('queue')
  async checkQueue() {
    const start = Date.now();
    try {
      await this.redis.ping();
      return { status: 'ok', latency: Date.now() - start };
    } catch (err: any) {
      return { status: 'error', latency: Date.now() - start, message: err?.message };
    }
  }
}
