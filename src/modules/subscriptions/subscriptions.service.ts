import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { User, UserDocument } from '../../database/schemas/users.schema';
import { Plan, PlanDocument } from '../../database/schemas/plans.schema';
import {
  Subscription,
  SubscriptionDocument,
} from '../../database/schemas/subscriptions.schema';
import {
  Payment,
  PaymentDocument,
} from '../../database/schemas/payments.schema';
import { formatPayments, formatSubscription } from 'src/helpers/helpers';
import { Role, RoleDocument } from 'src/database/schemas/roles.schema';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @Inject(forwardRef(() => StripeService))
    private stripeService: StripeService,
  ) {}

  // 🔥 CREATE CHECKOUT SESSION
  async createCheckoutSession(userId: string, planId: string) {
    const session = await this.stripeService.createCheckoutSession(
      userId,
      planId,
    );
    return { url: session.url };
  }

  // 🔥 CHANGE SUBSCRIPTION
  async changeSubscription(userId: string, newPlanId: string) {
    const subscription = await this.subscriptionModel.findOne({ user: userId });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const newPlan = await this.planModel.findById(newPlanId);
    if (!newPlan) {
      throw new NotFoundException('New plan not found');
    }

    try {
      await this.stripeService.changePlan(userId, newPlanId);
      subscription.plan = newPlan._id;
      await subscription.save();
    } catch (err: any) {
      throw new BadRequestException(
        'Failed to change subscription: ' + err.message,
      );
    }

    return { message: 'Subscription updated successfully' };
  }

  // 🔥 CANCEL SUBSCRIPTION
  async cancelSubscription(userId: string) {
    const subscription = await this.subscriptionModel.findOne({ user: userId });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    try {
      await this.stripeService.cancel(userId);
      subscription.status = 'canceled';
      await subscription.save();
    } catch (err: any) {
      throw new BadRequestException(
        'Failed to cancel subscription: ' + err.message,
      );
    }

    return { message: 'Subscription canceled successfully' };
  }

  // 🔥 WEBHOOK
  async handleWebhook(req: any, signature: string) {
    return await this.stripeService.handleWebhook(req, signature);
  }

  // 🔹 Get all subscriptions with user and plan names (Admin)
  async getAllSubscriptionsWithDetails() {
    const subs = await this.subscriptionModel
      .find()
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
