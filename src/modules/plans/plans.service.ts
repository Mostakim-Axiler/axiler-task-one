import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Plan, PlanDocument } from '../../database/schemas/plans.schema';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class PlansService {
  constructor(
    @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
    @Inject(forwardRef(() => StripeService))
    private stripeService: StripeService,
  ) {}

  // 🔹 CREATE PLAN WITH STRIPE PRICE
  async create(data: any): Promise<PlanDocument> {
    try {
      const createdPlan = await this.planModel.create(data);

      try {
        const {productId, priceId} = await this.stripeService.createPrice(createdPlan);
        createdPlan.stripeProductId = productId;
        createdPlan.stripePriceId = priceId;
        await createdPlan.save();
      } catch (stripeErr: any) {
        await this.planModel.findByIdAndDelete(createdPlan._id);

        throw new InternalServerErrorException(
          `Stripe price creation failed: ${stripeErr.message}`,
        );
      }

      return createdPlan;
    } catch (err: any) {
      throw new InternalServerErrorException(err.message);
    }
  }

  // 🔹 GET ALL PLANS
  async findAll(): Promise<PlanDocument[]> {
    try {
      return await this.planModel.find().lean();
    } catch (err: any) {
      throw new InternalServerErrorException(err.message);
    }
  }

  // 🔹 GET ACTIVE PLANS
  async findActive(): Promise<PlanDocument[]> {
    try {
      return await this.planModel.find({ isActive: true }).lean();
    } catch (err: any) {
      throw new InternalServerErrorException(err.message);
    }
  }

  // 🔹 GET SINGLE PLAN
  async findById(id: string): Promise<PlanDocument> {
    try {
      if (!Types.ObjectId.isValid(id))
        throw new BadRequestException('Invalid plan ID');

      const plan = await this.planModel.findById(id);
      if (!plan) throw new NotFoundException('Plan not found');

      return plan;
    } catch (err: any) {
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      )
        throw err;
      throw new InternalServerErrorException(err.message);
    }
  }

  // 🔹 UPDATE PLAN
  async update(id: string, data: any): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid plan ID');
    }

    // 🔹 Get existing plan
    const existingPlan = await this.planModel.findById(id);
    if (!existingPlan) {
      throw new NotFoundException('Plan not found');
    }

    // 🔹 Clone old data for rollback
    const previousData = existingPlan.toObject();

    // 🔹 Unique name check
    if (data.name) {
      const duplicate = await this.planModel.findOne({
        name: data.name.trim(),
        _id: { $ne: id },
      });

      if (duplicate) {
        throw new BadRequestException('Plan name already in use');
      }

      data.name = data.name.trim();
    }

    // 🔹 Step 1: Update MongoDB FIRST
    let updatedPlan: any;
    try {
      updatedPlan = await this.planModel.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
        returnDocument: 'after'
      });
    } catch (err: any) {
      throw new InternalServerErrorException(err.message);
    }

    // 🔹 Step 2: Call Stripe
    try {
      if (data.price || data.interval) {
        const stripePrice = await this.stripeService.updatePrice(updatedPlan);

        // 🔹 Save stripe price
        updatedPlan.stripePriceId = stripePrice;
        await updatedPlan.save();
      }

      return updatedPlan;
    } catch (err: any) {
      // ❌ Stripe failed → rollback MongoDB
      await this.planModel.findByIdAndUpdate(id, previousData);
      throw new InternalServerErrorException(
        `Stripe failed, rollback applied: ${err.message}`,
      );
    }
  }
  // 🔹 TOGGLE ACTIVE
  async setActive(id: string, isActive: boolean): Promise<PlanDocument> {
    try {
      const plan = await this.planModel.findByIdAndUpdate(
        id,
        { isActive },
        { new: true },
      );
      if (!plan) throw new NotFoundException('Plan not found');
      return plan;
    } catch (err: any) {
      throw new InternalServerErrorException(err.message);
    }
  }

  // 🔹 DELETE PLAN
  async delete(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid plan ID');
    }

    const plan = await this.planModel.findById(id);
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    try {
      // 🔹 Step 1: Deactivate Stripe price (if exists)
      if (plan.stripePriceId) {
        const stripeDeactivated = await this.stripeService.inactivePrice(plan);

        if (!stripeDeactivated) {
          throw new InternalServerErrorException(
            'Failed to deactivate Stripe price',
          );
        }
      }

      // 🔹 Step 2: Delete from MongoDB
      await this.planModel.findByIdAndDelete(id);

      return { message: 'Plan deleted successfully' };
    } catch (err: any) {
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }

      throw new InternalServerErrorException(err.message);
    }
  }
}
