import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Plan, PlanDocument } from '../../database/schemas/plans.schema';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class PlansService {
  constructor(
    @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
    private stripeService: StripeService,
  ) { }

  // 🔹 Create Plan
  async create(data: any): Promise<Plan> {
    if (data.interval === 'free') {
      data.price = 0;
      data.stripePriceId = null;
    } else {
      // 🔥 Create Stripe price
      const stripePriceId = await this.stripeService.createPlanPrice({
        name: data.name,
        price: data.price,
        interval: data.interval as 'monthly' | 'yearly',
      });

      data.stripePriceId = stripePriceId;
    }
    const plan = await this.planModel.create(data);
    return plan;
  }

  // 🔹 Get All Plans
  async findAll(): Promise<Plan[]> {
    return this.planModel.find().lean();
  }

  // 🔹 Get Active Plans (optional useful endpoint)
  async findActive(): Promise<Plan[]> {
    return this.planModel.find({ isActive: true }).lean();
  }

  // 🔹 Get Single Plan
  async findById(id: string): Promise<Plan> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid plan ID');
    }
    const plan = await this.planModel.findById(id);

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return plan;
  }

  // 🔹 Update Plan
  async update(id: string, data: any): Promise<Plan> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid plan ID');
    }
    const updated = await this.planModel.findByIdAndUpdate(
      id,
      data,
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Plan not found');
    }

    return updated;
  }
  
  // 🔹 Toggle Active
  async setActive(id: string, isActive: boolean): Promise<Plan> {
    const plan = await this.planModel.findByIdAndUpdate(
      id,
      { isActive },
      { new: true },
    );

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return plan;
  }

  // 🔹 Delete Plan
  async delete(id: string): Promise<{ message: string }> {
    const deleted = await this.planModel.findByIdAndDelete(id);

    if (!deleted) {
      throw new NotFoundException('Plan not found');
    }

    return { message: 'Plan deleted successfully' };
  }
}