import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Subscription,
  SubscriptionSchema,
} from '../../database/schemas/subscriptions.schema';
import { User, UserSchema } from 'src/database/schemas/users.schema';
import { SubscriptionsService } from './subscriptions.service';
import { Plan, PlanSchema } from 'src/database/schemas/plans.schema';
import { UsersModule } from '../users/users.module';
import { SubscriptionsController } from './subscription.controller';
import { Payment, PaymentSchema } from 'src/database/schemas/payments.schema';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Role, RoleSchema } from 'src/database/schemas/roles.schema';
import Stripe from 'stripe';
import { StripeModule } from '../stripe/stripe.module';
import { PlansModule } from '../plans/plans.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Plan.name, schema: PlanSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
    forwardRef(() => StripeModule),
    forwardRef(() => UsersModule),
    forwardRef(() => PlansModule),
    forwardRef(() => PaymentsModule),
    ConfigModule,

    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  providers: [SubscriptionsService],
  controllers: [SubscriptionsController],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
