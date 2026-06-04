import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import * as crypto from 'crypto';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    // Rate limiting: three named tiers for flexible per-endpoint overrides
    ThrottlerModule.forRoot([
      {
        // default — applied to most endpoints via the global guard
        name: 'default',
        ttl: 60_000, // 1 minute window
        limit: 30,
      },
      {
        // strict — for sensitive mutation endpoints (create-link, reconcile)
        name: 'strict',
        ttl: 60_000,
        limit: 5,
      },
      {
        // webhook — high-volume Midtrans traffic; generous limit to avoid blocking
        name: 'webhook',
        ttl: 60_000,
        limit: 120,
      },
    ]),
    // Structured JSON logger configuration
    LoggerModule.forRoot({
      pinoHttp: {
        // Unique request/correlation ID generator
        genReqId: (req) => {
          return (
            req.headers['x-correlation-id'] ||
            req.headers['x-request-id'] ||
            crypto.randomUUID()
          );
        },
        // Automatically attach authenticated user details to request logs
        customProps: (req) => {
          const user = (req as any).user;
          return {
            userId: user?.id || undefined,
          };
        },
        // Pretty print in development; raw fast JSON in production
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                  colorize: true,
                  translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
                },
              }
            : undefined,
        // Redact sensitive authorization tokens and PII (personal data)
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.customerName',
            'req.body.customerPhone',
            'req.body.customerEmail',
            'req.body.shippingAddress',
            'res.headers["set-cookie"]',
          ],
          censor: '***',
        },
      },
    }),
    // ScheduleModule activates all @Cron / @Interval / @Timeout decorators
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    PaymentsModule,
    InvoicesModule,
    ReviewsModule,
  ],
  providers: [
    // Global rate-limit guard — applies 'default' tier unless @Throttle() overrides
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
