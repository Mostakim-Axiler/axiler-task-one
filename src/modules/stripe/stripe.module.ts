import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StripeService } from './stripe.service';
import { UsersModule } from '../users/users.module';
import { PlansModule } from '../plans/plans.module';
import {
  Subscription,
  SubscriptionSchema,
} from 'src/database/schemas/subscriptions.schema';

import { Payment, PaymentSchema } from 'src/database/schemas/payments.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => PlansModule),
  ],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
