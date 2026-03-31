// subscriptions.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';

import { User, UserDocument } from '../../database/schemas/users.schema';
import { Plan, PlanDocument } from '../../database/schemas/plans.schema';
import { Subscription, SubscriptionDocument } from '../../database/schemas/subscriptions.schema';
import { Payment, PaymentDocument } from '../../database/schemas/payments.schema';
import { calculateEndDate } from 'src/helpers/helpers';
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

        // ✅ Free plan
        if (plan.interval === 'free') {
            await this.subscriptionModel.create({
                user: user._id,
                plan: plan._id,
                status: 'active',
                currentPeriodStart: new Date(),
            });

            return { message: 'Free plan activated' };
        }

        // ✅ Create Stripe customer
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

            // 🔥 ADD THIS BLOCK ONLY
            subscription_data: {
                metadata: {
                    userId: user._id.toString(),
                    planId: plan._id.toString(),
                },
            },
        });

        return { url: session.url };
    }

    // 🔥 WEBHOOK (CORE LOGIC)
    async handleWebhook(req: any, signature: string) {
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(
                req.body,
                signature,
                endpointSecret,
            );
        } catch (err) {
            throw new Error(`Webhook Error: ${err.message}`);
        }

        console.log('🔥 EVENT:', event.type);

        switch (event.type) {
            // ✅ CREATE SUBSCRIPTION
            case 'customer.subscription.created': {
                const sub: any = event.data.object;

                // ✅ FIRST try subscription metadata
                let userId = sub.metadata?.userId;
                console.log('meta', sub.metadata)

                // 🔁 fallback to customer metadata
                if (!userId) {
                    const customer = await this.stripe.customers.retrieve(sub.customer);
                    userId = (customer as Stripe.Customer).metadata?.userId;
                    console.log('customer', customer)
                }

                if (!userId) {
                    console.log('❌ userId missing');
                    break;
                }


                const start =
                    sub.current_period_start ||
                    sub.billing_cycle_anchor ||
                    sub.start_date;

                const startDate = new Date(start * 1000);

                const endDate = calculateEndDate(startDate, sub.plan.interval);

                if (!start) {
                    console.log('⚠️ No valid start date');
                    break;
                }

                const exists = await this.subscriptionModel.findOne({
                    stripeSubscriptionId: sub.id,
                });

                if (exists) break;

                await this.subscriptionModel.create({
                    stripeSubscriptionId: sub.id,
                    user: userId,
                    status: sub.status,
                    currentPeriodStart: startDate,
                    currentPeriodEnd: endDate
                });

                break;
            }

            // ✅ ATTACH USER + PLAN
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

            // ✅ SAVE PAYMENT
            case 'invoice.payment_succeeded': {
                const invoice: any = event.data.object;

                const exists = await this.paymentModel.findOne({
                    stripeInvoiceId: invoice.id,
                });

                if (exists) break;

                const subscription = await this.subscriptionModel.findOne({
                    stripeSubscriptionId: invoice.subscription,
                });

                await this.paymentModel.create({
                    user: subscription?.user,
                    stripeInvoiceId: invoice.id,
                    stripePaymentIntentId: invoice.payment_intent,
                    amount: invoice.amount_paid / 100,
                    currency: invoice.currency,
                    status: 'succeeded',
                    paidAt: new Date(),
                });

                break;
            }

            // ❌ PAYMENT FAILED
            case 'invoice.payment_failed': {
                const invoice: any = event.data.object;

                await this.subscriptionModel.findOneAndUpdate(
                    { stripeSubscriptionId: invoice.subscription },
                    { status: 'past_due' },
                );

                break;
            }

            // 🔁 UPDATE SUBSCRIPTION
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

            // ❌ CANCEL
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

    // 🔥 CHANGE PLAN
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

        const stripeSub = await this.stripe.subscriptions.retrieve(
            subscription.stripeSubscriptionId,
        ) as Stripe.Subscription;

        const item = stripeSub.items.data[0];

        await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            items: [
                {
                    id: item.id,
                    price: newPlan.stripePriceId,
                },
            ],
            proration_behavior: 'create_prorations',
        });

        await this.subscriptionModel.findByIdAndUpdate(subscription._id, {
            plan: newPlan._id,
        });

        return { message: 'Plan updated successfully' };
    }
}