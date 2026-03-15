import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import {
  configuration,
  validationSchema,
} from './common/config/configuration.js';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';

import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { MessagesModule } from './modules/messages/messages.module.js';
import { QueueModule } from './modules/queue/queue.module.js';
import { AiModule } from './modules/ai/ai.module.js';
import { TransactionsModule } from './modules/transactions/transactions.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { GoalsModule } from './modules/goals/goals.module.js';
import { RemindersModule } from './modules/reminders/reminders.module.js';
import { InsightsModule } from './modules/insights/insights.module.js';
import { ForecastModule } from './modules/forecast/forecast.module.js';
import { MessagingModule } from './modules/messaging/messaging.module.js';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module.js';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),

    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),

    ScheduleModule.forRoot(),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = new URL(configService.get<string>('REDIS_URL')!);
        return {
          connection: {
            host: redisUrl.hostname,
            port: Number(redisUrl.port) || 6379,
            password: redisUrl.password || undefined,
          },
        };
      },
    }),

    PrismaModule,
    AuthModule,
    UsersModule,
    MessagesModule,
    QueueModule,
    AiModule,
    TransactionsModule,
    CategoriesModule,
    GoalsModule,
    RemindersModule,
    InsightsModule,
    ForecastModule,
    MessagingModule,
    WhatsAppModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
