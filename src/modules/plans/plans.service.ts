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
        const stripePriceId = await this.stripeService.createPrice(createdPlan);
        createdPlan.stripePriceId = stripePriceId;
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
  async update(id: string, data: any): Promise<PlanDocument> {
    const session = await this.planModel.db.startSession();
    session.startTransaction();

    try {
      if (!Types.ObjectId.isValid(id))
        throw new BadRequestException('Invalid plan ID');

      // ✅ Check unique name
      if (data.name) {
        const existingPlan = await this.planModel
          .findOne({
            name: data.name.trim(),
            _id: { $ne: id },
          })
          .session(session);

        if (existingPlan) {
          throw new BadRequestException('Plan name already in use');
        }
        data.name = data.name.trim();
      }

      const updated = await this.planModel.findByIdAndUpdate(id, data, {
        new: true,
        session,
      });
      if (!updated) throw new NotFoundException('Plan not found');

      // If Stripe price changed (price or interval), recreate Stripe price
      if (data.price || data.interval) {
        try {
          await this.stripeService.createPrice(updated);
        } catch (stripeErr: any) {
          throw new InternalServerErrorException(
            `Stripe price update failed: ${stripeErr.message}`,
          );
        }
      }

      await session.commitTransaction();
      return updated;
    } catch (err: any) {
      await session.abortTransaction();
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      )
        throw err;
      throw new InternalServerErrorException(err.message);
    } finally {
      session.endSession();
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
    const session = await this.planModel.db.startSession();
    session.startTransaction();

    try {
      const deleted = await this.planModel.findByIdAndDelete(id, { session });
      if (!deleted) throw new NotFoundException('Plan not found');

      // TODO: Optionally, you could also delete the corresponding Stripe product/price if needed

      await session.commitTransaction();
      return { message: 'Plan deleted successfully' };
    } catch (err: any) {
      await session.abortTransaction();
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException(err.message);
    } finally {
      session.endSession();
    }
  }
}
