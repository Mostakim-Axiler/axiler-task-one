import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  Payment,
  PaymentDocument,
} from '../../database/schemas/payments.schema';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
  ) {}

  // ✅ Get ALL payments (admin)
  async getAllPayments() {
    return this.paymentModel
      .find()
      .sort({ createdAt: -1 })
      .populate({
        path: 'user',
        select: 'name email',
      })
      .populate({
        path: 'subscription',
        select: 'status currentPeriodStart currentPeriodEnd',
        populate: {
          path: 'plan',
          select: 'name price interval',
        },
      });
  }
}
