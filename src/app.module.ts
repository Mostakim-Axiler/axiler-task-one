import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { RolesModule } from './modules/roles/roles.module';
import { PlansModule } from './modules/plans/plans.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { StripeModule } from './modules/stripe/stripe.module';
import { SeedModule } from './database/seeds/seed.module';
import { WelcomeModule } from './modules/welcome/welcome.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('MONGO_URI');

        if (!uri) {
          throw new Error('MONGO_URI is not defined');
        }
        console.log('✅ Connecting to MongoDB...');
        return { uri };
      },
    }),

    WelcomeModule,

    SeedModule,

    AuthModule,
    
    UsersModule,

    RolesModule,

    PlansModule,

    SubscriptionsModule,

    PaymentsModule,

    StripeModule,
  ],
})
export class AppModule {}