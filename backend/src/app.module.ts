import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './auth/auth.module';
import { MarketDataModule } from './market-data/market-data.module';
import { AiModule } from './ai/ai.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { NotificationModule } from './notifications/notification.module';
import { SchedulerModule } from './jobs/scheduler.module';
import { WebsocketModule } from './websocket/websocket.module';
import { LogsModule } from './logs/logs.module';
import { HealthModule } from './health/health.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('POSTGRES_HOST', 'localhost'),
        port: config.get<number>('POSTGRES_PORT', 5432),
        username: config.get('POSTGRES_USER', 'nse_user'),
        password: config.get('POSTGRES_PASSWORD', 'nse_secure_pass_2024'),
        database: config.get('POSTGRES_DB', 'nse_market'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: config.get('NODE_ENV') === 'development',
        ssl: config.get('POSTGRES_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        retryAttempts: 0,        // Don't block startup if DB is unavailable
        retryDelay: 3000,
        extra: {
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        },
      }),
      inject: [ConfigService],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        throttlers: [{
          ttl: config.get<number>('THROTTLE_TTL', 60) * 1000,
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        }],
      }),
      inject: [ConfigService],
    }),

    // Task scheduling
    ScheduleModule.forRoot(),

    // Queue
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
          lazyConnect: true,    // Don't block startup if Redis is unavailable
          enableOfflineQueue: false,
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    AuthModule,
    MarketDataModule,
    AiModule,
    WatchlistModule,
    NotificationModule,
    SchedulerModule,
    WebsocketModule,
    LogsModule,
    HealthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
