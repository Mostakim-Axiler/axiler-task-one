
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';

import { User, UserDocument } from '../../database/schemas/users.schema';
import { Plan, PlanDocument } from '../../database/schemas/plans.schema';
import { Subscription, SubscriptionDocument } from '../../database/schemas/subscriptions.schema';
import { Payment, PaymentDocument } from '../../database/schemas/payments.schema';
import { calculateEndDate, formatPayments, formatSubscription } from 'src/helpers/helpers';
import { Role, RoleDocument } from 'src/database/schemas/roles.schema';

@Injectable()
export class SubscriptionsService {
    private stripe: Stripe;

    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
        @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
        @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
        @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    ) {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: '2026-03-25.dahlia',
        });
    }

    // 🔥 CREATE CHECKOUT SESSION
    async createCheckoutSession(data: any) {
        let user = await this.userModel.findOne({ email: data.email });

        if (!user) {
            const customerRole = await this.roleModel.findOne({ name: 'customer' });

            if (!customerRole) {
                throw new NotFoundException('Customer role not found');
            }

            const roleId = customerRole._id;
            user = await this.userModel.create({
                name: data.name,
                email: data.email,
                role: roleId
            });
        }

        const plan = await this.planModel.findById(data.planId);
        if (!plan) throw new NotFoundException('Plan not found');

        // ✅ prevent duplicate subscriptions
        const existingSub = await this.subscriptionModel.findOne({
            user: user._id,
            status: { $in: ['active', 'past_due', 'incomplete'] },
        });

        if (existingSub) {
            throw new Error('User already has an active subscription');
        }

        // ✅ Free plan
        if (plan.interval === 'free') {
            await this.subscriptionModel.findOneAndUpdate(
                { user: user._id },
                {
                    user: user._id,
                    plan: plan._id,
                    status: 'active',
                    currentPeriodStart: new Date(),
                },
                { upsert: true, returnDocument: 'after' }
            );

            return { message: 'Free plan activated' };
        }

        if (!user.stripeCustomerId) {
            const customer = await this.stripe.customers.create({
                email: user.email,
                name: user.name,
                metadata: {
                    userId: user._id.toString(),
                },
            });

            user.stripeCustomerId = customer.id;
            await user.save();
        }

        const session = await this.stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: user.stripeCustomerId,
            line_items: [
                {
                    price: plan.stripePriceId,
                    quantity: 1,
                },
            ],
            success_url: `${process.env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: process.env.STRIPE_CANCEL_URL,

            metadata: {
                userId: user._id.toString(),
                planId: plan._id.toString(),
            },

            subscription_data: {
                metadata: {
                    userId: user._id.toString(),
                    planId: plan._id.toString(),
                },
            },
        });

        return { url: session.url };
    }

    // 🔥 WEBHOOK
    async handleWebhook(req: any, signature: string) {
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(
                req.body,
                signature,
                endpointSecret,
            );
        } catch (err: any) {
            throw new Error(`Webhook Error: ${err.message}`);
        }

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

                // ✅ UPSERT instead of create
                await this.subscriptionModel.findOneAndUpdate(
                    { user: userId },
                    {
                        stripeSubscriptionId: sub.id,
                        user: userId,
                        status: sub.status,
                        currentPeriodStart: startDate,
                        currentPeriodEnd: endDate,
                    },
                    { upsert: true, returnDocument: 'after' }
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

                // 🔥 fallback: try to fetch user from Stripe customer
                if (!subscription) {
                    const customer = await this.stripe.customers.retrieve(invoice.customer);

                    const userId = (customer as Stripe.Customer).metadata?.userId;

                    if (userId) {
                        subscription = await this.subscriptionModel.findOne({ user: userId });
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
    }

    async changePlan(userId: string, newPlanId: string) {
        const subscription = await this.subscriptionModel.findOne({
            user: userId,
            status: 'active',
        });

        if (!subscription) {
            throw new NotFoundException('Active subscription not found');
        }

        const newPlan = await this.planModel.findById(newPlanId);
        if (!newPlan) {
            throw new NotFoundException('Plan not found');
        }

        // ✅ prevent same plan change
        if (subscription.plan?.toString() === newPlanId) {
            return { message: 'Already on this plan' };
        }

        const stripeSub = await this.stripe.subscriptions.retrieve(
            subscription.stripeSubscriptionId,
        ) as Stripe.Subscription;

        const item = stripeSub.items.data[0];

        // ✅ detect upgrade vs downgrade
        const isUpgrade = true; // default fallback

        // OPTIONAL (if you store price in Plan)
        // const currentPlan = await this.planModel.findById(subscription.plan);
        // const isUpgrade = newPlan.price > currentPlan.price;

        await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            items: [
                {
                    id: item.id,
                    price: newPlan.stripePriceId,
                },
            ],

            // ✅ KEY DIFFERENCE
            proration_behavior: 'create_prorations',

            // 🔥 THIS handles downgrade properly
            billing_cycle_anchor: 'unchanged',
        });

        // ✅ update local DB
        await this.subscriptionModel.findByIdAndUpdate(subscription._id, {
            plan: newPlan._id,
        });

        return {
            message: 'Plan updated successfully',
            type: 'upgrade_or_downgrade',
        };
    }

    // 🔹 Get all subscriptions with user and plan names (Admin)
    async getAllSubscriptionsWithDetails() {
        const subs = await this.subscriptionModel.find()
            .populate({ path: 'user', select: 'name email' })
            .populate({ path: 'plan', select: 'name price interval' });
        return subs.map(formatSubscription);
    }

    // 🔹 Get individual subscription with user and plan names (Admin)
    async getSubscriptionWithDetails(id: string) {
  // 🔒 Validate ObjectId
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException('Invalid subscription ID');
  }

  const sub = await this.subscriptionModel
    .findById(id)
    .populate({ path: 'user', select: 'name email' })
    .populate({ path: 'plan', select: 'name price interval' })
    .lean(); // ⚡ performance boost

  if (!sub) {
    throw new NotFoundException('Subscription not found');
  }

  // 💳 Get ALL payments for this subscription
  const payments = await this.paymentModel
    .find({ subscription: sub._id })
    .sort({ createdAt: -1 }) // newest first
    .lean();

  return {
    ...formatSubscription(sub),
    payments: formatPayments(payments),
  };
}
}