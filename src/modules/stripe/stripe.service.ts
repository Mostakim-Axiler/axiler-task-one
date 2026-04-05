import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import Stripe from 'stripe';
import { UsersService } from '../users/users.service';
import { PlansService } from '../plans/plans.service';
import {
  Subscription,
  SubscriptionDocument,
} from 'src/database/schemas/subscriptions.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { calculateEndDate } from 'src/helpers/helpers';
import { Payment, PaymentDocument } from 'src/database/schemas/payments.schema';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(Payment.name)
    private paymentModel: Model<PaymentDocument>,
    @Inject(forwardRef(() => UsersService)) private userService: UsersService,
    @Inject(forwardRef(() => PlansService)) private planService: PlansService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-03-25.dahlia',
    });
  }

  // ✅ CREATE STRIPE PRICE
  async createPrice(
    plan: any,
  ): Promise<{ productId: string; priceId: string }> {
    let product: Stripe.Product | null = null;

    try {
      // 1️⃣ Create Stripe Product
      product = await this.stripe.products.create({
        name: plan.name,
        metadata: {
          planId: plan._id.toString(),
          planLevel: plan.level.toString(),
        },
      });

      // 2️⃣ Create Stripe Price
      const price = await this.stripe.prices.create({
        unit_amount: plan.price * 100,
        currency: 'usd',
        recurring: {
          interval: plan.interval,
          interval_count: 1,
        },
        product: product.id,
      });

      // ✅ Return BOTH IDs
      return {
        productId: product.id,
        priceId: price.id,
      };
    } catch (err: any) {
      // 🔥 Rollback Stripe Product if created
      if (product) {
        try {
          await this.stripe.products.del(product.id);
        } catch (delErr) {
          console.error('Failed to rollback Stripe product', delErr);
        }
      }

      throw new InternalServerErrorException(err.message);
    }
  }

  // ✅ UPDATE PRICE
  async updatePrice(plan: any): Promise<string> {
    let newPrice: Stripe.Price | null = null;

    try {
      if (!plan.stripeProductId) {
        throw new BadRequestException('Missing Stripe product ID');
      }
      if (!plan.stripePriceId) {
        throw new BadRequestException('Missing Stripe product ID');
      }

      // ✅ 1. Create NEW price
      newPrice = await this.stripe.prices.create({
        unit_amount: plan.price * 100,
        currency: 'usd',
        recurring: {
          interval: plan.interval,
          interval_count: 1,
        },
        product: plan.stripeProductId,
      });

      // ✅ 2. Deactivate OLD price (if exists)
      if (plan.stripePriceId) {
        await this.stripe.prices.update(plan.stripePriceId, {
          active: false,
        });
      }

      // ✅ 3. Return new price ID
      return newPrice.id;
    } catch (err: any) {
      // 🔥 rollback newly created price if something fails
      if (newPrice) {
        try {
          await this.stripe.prices.update(newPrice.id, {
            active: false,
          });
        } catch (rollbackErr) {
          console.error('Failed to rollback new price', rollbackErr);
        }
      }

      throw new InternalServerErrorException(err.message);
    }
  }

  // INACTIVE PRICE
  async inactivePrice(plan: any): Promise<boolean> {
    try {
      await this.stripe.products.del(plan.stripeProductId);
      await this.stripe.prices.update(plan.stripePriceId, {
        active: false,
      });
      return true;
    } catch (err: any) {
      // throw new InternalServerErrorException(err.message);
      return false;
    }
  }

  // ✅ CREATE CUSTOMER
  async createCustomer(userId: string) {
    let customer: Stripe.Customer | null = null;

    try {
      const user = await this.userService.findById(userId);
      if (!user) throw new BadRequestException('User not found');
      // 1️⃣ Create Stripe Customer
      customer = await this.stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });

      // 2️⃣ Update User in MongoDB
      await this.userService.updateUser(userId, {
        stripeCustomerId: customer.id,
      });
      return customer;
    } catch (err: any) {
      // Rollback Stripe Customer
      if (customer) {
        try {
          await this.stripe.customers.del(customer.id);
        } catch (delErr) {
          console.error('Failed to rollback Stripe customer', delErr);
        }
      }
      throw new InternalServerErrorException(err.message);
    }
  }

  // ✅ CREATE CHECKOUT SESSION
  async createCheckoutSession(userId: string, planId: string) {
    try {
      const user = await this.userService.findById(userId);
      const plan = await this.planService.findById(planId);

      if (!user || !plan) throw new BadRequestException('Invalid user or plan');

      if (!user.stripeCustomerId) {
        const customer = await this.createCustomer(userId);
        user.stripeCustomerId = customer.id;
      }

      return this.stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: user.stripeCustomerId,
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        success_url: `${process.env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.STRIPE_CANCEL_URL}?session_id={CHECKOUT_SESSION_ID}`,
        metadata: { userId: user.id, planId: plan._id.toString() },
        subscription_data: {
          metadata: {
            userId: user.id,
            planId: plan._id.toString(),
          },
        },
      });
    } catch (err: any) {
      throw new InternalServerErrorException(err.message);
    }
  }

  // ✅ UPDATE SUBSCRIPTION
  async updateSubscription(
    subscriptionId: string,
    itemId: string,
    priceId: string,
    proration: boolean,
  ) {
    try {
      return await this.stripe.subscriptions.update(subscriptionId, {
        items: [{ id: itemId, price: priceId }],
        proration_behavior: proration ? 'create_prorations' : 'none',
      });
    } catch (err: any) {
      throw new InternalServerErrorException(err.message);
    }
  }

  // ✅ UPGRADE
  async upgrade(userId: string, newPlanId: string) {
    try {
      const user = await this.userService.findById(userId);
      const newPlan = await this.planService.findById(newPlanId);

      if (!user?.subscriptionId || !user?.subscriptionItemId) {
        throw new BadRequestException('No active subscription');
      }

      await this.updateSubscription(
        user.subscriptionId,
        user.subscriptionItemId,
        newPlan.stripePriceId,
        true,
      );

      return { message: 'Upgraded instantly' };
    } catch (err: any) {
      throw new InternalServerErrorException(err.message);
    }
  }

  // ✅ DOWNGRADE
  async downgrade(userId: string, newPlanId: string) {
    try {
      const user = await this.userService.findById(userId);
      const newPlan = await this.planService.findById(newPlanId);

      if (!user?.subscriptionId || !user?.subscriptionItemId) {
        throw new BadRequestException('No active subscription');
      }

      await this.updateSubscription(
        user.subscriptionId,
        user.subscriptionItemId,
        newPlan.stripePriceId,
        false,
      );

      return { message: 'Downgrade scheduled' };
    } catch (err: any) {
      throw new InternalServerErrorException(err.message);
    }
  }

  // ✅ CANCEL
  async cancel(userId: string) {
    try {
      const user = await this.userService.findById(userId);

      if (!user?.subscriptionId)
        throw new BadRequestException('No subscription');

      await this.stripe.subscriptions.update(user.subscriptionId, {
        cancel_at_period_end: true,
      });

      return { message: 'Canceled at period end' };
    } catch (err: any) {
      throw new InternalServerErrorException(err.message);
    }
  }

  // ✅ CHANGE PLAN
  async changePlan(userId: string, newPlanId: string) {
    try {
      const user = await this.userService.findById(userId);
      const currentPlan = await this.planService.findById(user.planId);
      const newPlan = await this.planService.findById(newPlanId);

      if (!user || !newPlan)
        throw new BadRequestException('Invalid user or plan');

      // FREE → PAID
      if (currentPlan.price === 0 && newPlan.price > 0) {
        return this.createCheckoutSession(userId, newPlanId);
      }

      // PAID → FREE
      if (newPlan.price === 0) {
        await this.cancel(userId);
        return { message: 'Will switch to free plan at period end' };
      }

      // Upgrade/Downgrade
      if (newPlan.level > currentPlan.level)
        return this.upgrade(userId, newPlanId);
      if (newPlan.level < currentPlan.level)
        return this.downgrade(userId, newPlanId);

      throw new BadRequestException('Same plan selected');
    } catch (err: any) {
      throw new InternalServerErrorException(err.message);
    }
  }

  // 🔥 HANDLE WEBHOOK
  async handleWebhook(req: any, signature: string) {
    try {
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

      const event: Stripe.Event = this.stripe.webhooks.constructEvent(
        req.rawBody, // ✅ keep rawBody
        signature,
        endpointSecret,
      );

      switch (event.type) {
        case 'customer.subscription.created': {
          const sub: any = event.data.object;

          let userId = sub.metadata?.userId;

          if (!userId) {
            const customer = await this.stripe.customers.retrieve(sub.customer);
            userId = (customer as Stripe.Customer).metadata?.userId;
          }

          if (!userId) break;

          const start =
            sub.current_period_start ||
            sub.billing_cycle_anchor ||
            sub.start_date;

          if (!start) break;

          const startDate = new Date(start * 1000);
          const endDate = calculateEndDate(startDate, sub.plan.interval);

          await this.subscriptionModel.findOneAndUpdate(
            { user: userId },
            {
              stripeSubscriptionId: sub.id,
              user: userId,
              status: sub.status,
              currentPeriodStart: startDate,
              currentPeriodEnd: endDate,
            },
            { upsert: true, returnDocument: 'after' },
          );

          break;
        }

        case 'checkout.session.completed': {
          const session: any = event.data.object;

          if (!session.subscription) break;

          await this.subscriptionModel.findOneAndUpdate(
            { stripeSubscriptionId: session.subscription },
            {
              user: session.metadata?.userId,
              plan: session.metadata?.planId,
            },
          );

          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice: any = event.data.object;

          const exists = await this.paymentModel.findOne({
            stripeInvoiceId: invoice.id,
          });

          if (exists) break;

          let subscription = await this.subscriptionModel.findOne({
            stripeSubscriptionId: invoice.subscription,
          });

          // 🔥 fallback
          if (!subscription) {
            const customer = await this.stripe.customers.retrieve(
              invoice.customer,
            );

            const userId = (customer as Stripe.Customer).metadata?.userId;

            if (userId) {
              subscription = await this.subscriptionModel.findOne({
                user: userId,
              });
            }
          }

          await this.paymentModel.create({
            user: subscription?.user,
            subscription: subscription?._id,
            stripeInvoiceId: invoice.id,
            stripePaymentIntentId: invoice.payment_intent,
            amount: invoice.amount_paid / 100,
            currency: invoice.currency,
            status: 'succeeded',
            paidAt: new Date(),
          });

          break;
        }

        case 'invoice.payment_failed': {
          const invoice: any = event.data.object;

          await this.subscriptionModel.findOneAndUpdate(
            { stripeSubscriptionId: invoice.subscription },
            { status: 'past_due' },
          );

          break;
        }

        case 'customer.subscription.updated': {
          const sub: any = event.data.object;

          await this.subscriptionModel.findOneAndUpdate(
            { stripeSubscriptionId: sub.id },
            {
              status: sub.status,
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
            },
          );

          break;
        }

        case 'customer.subscription.deleted': {
          const sub: any = event.data.object;

          await this.subscriptionModel.findOneAndUpdate(
            { stripeSubscriptionId: sub.id },
            { status: 'canceled' },
          );

          break;
        }
      }

      return { received: true };
    } catch (err: any) {
      console.error('Webhook error:', err);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }
  }
}
