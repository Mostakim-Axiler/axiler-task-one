import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { MailerModule } from '@nestjs-modules/mailer';

import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { RolesModule } from './modules/roles/roles.module';
import { PlansModule } from './modules/plans/plans.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { StripeModule } from './modules/stripe/stripe.module';
import { SeedModule } from './database/seeds/seed.module';
import { EmailModule } from './modules/mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // ✅ Throttler config (modern format)
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60,
          limit: 10,
        },
      ],
    }),

    // ✅ Mongo
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('MONGO_URI');
        if (!uri) throw new Error('MONGO_URI is not defined');
        console.log('✅ Connecting to MongoDB...');
        return { uri };
      },
    }),

    // ✅ Redis (BullMQ)
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const password = config.get<string>('REDIS_PASSWORD');

        return {
          connection: {
            host: config.get<string>('REDIS_HOST'),
            port: Number(config.get<number>('REDIS_PORT')),
            ...(password ? { password } : {}),
          },
        };
      },
    }),

    // ✅ Mail
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>('MAIL_HOST'),
          port: Number(config.get<number>('MAIL_PORT')),
          auth: {
            user: config.get<string>('MAIL_USER'),
            pass: config.get<string>('MAIL_PASS'),
          },
        },
        defaults: {
          from: '"No Reply" <no-reply@test.com>',
        },
      }),
    }),

    SeedModule,
    EmailModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PlansModule,
    SubscriptionsModule,
    PaymentsModule,
    StripeModule,
  ],

  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }