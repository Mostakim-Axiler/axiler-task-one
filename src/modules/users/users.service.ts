import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../database/schemas/users.schema';
import { Role, RoleDocument } from '../../database/schemas/roles.schema';
import {
  Subscription,
  SubscriptionDocument,
} from 'src/database/schemas/subscriptions.schema';
import { formatUser } from 'src/helpers/helpers';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
    @Inject(forwardRef(() => StripeService))
    private stripeService: StripeService,
  ) {}

  // 🔹 CREATE USER
  async create(data: any): Promise<UserDocument> {
    let user: UserDocument | null = null;
    try {
      const email = data.email?.toLowerCase().trim();
      if (!email) throw new BadRequestException('Email is required');

      const existingUser = await this.userModel.findOne({ email });
      if (existingUser)
        throw new BadRequestException('This email is already registered');

      // Get role
      let role: any;
      if (data.role) {
        role = await this.roleModel.findById(data.role);
        if (!role) throw new NotFoundException('Role not found');
      } else {
        role = await this.roleModel.findOne({ name: 'customer' });
        if (!role) throw new NotFoundException('Customer role not found');
      }

      // Create user in MongoDB
      user = await this.userModel.create({ ...data, email, role: role._id });

      // Create Stripe customer if role is customer
      if (role.name === 'customer') {
        try {
          await this.stripeService.createCustomer(user._id.toString());
        } catch (stripeErr: any) {
          // Rollback MongoDB user if Stripe fails
          if (user) {
            await this.userModel.findByIdAndDelete(user._id);
          }
          throw new InternalServerErrorException(
            `Stripe customer creation failed: ${stripeErr.message}`,
          );
        }
      }

      return user;
    } catch (error: any) {
      // General error
      throw new InternalServerErrorException(error.message);
    }
  }

  // 🔹 FIND BY EMAIL
  async findByEmail(email: string): Promise<UserDocument | null> {
    try {
      return await this.userModel
        .findOne({ email: email.toLowerCase().trim() })
        .select('+password')
        .populate('role');
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  // 🔹 FIND BY ID
  async findById(id: string): Promise<any> {
    try {
      const user = await this.userModel.findById(id).populate('role');

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return formatUser(user);
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  // 🔹 FIND ALL
  async findAllUsers() {
    try {
      const users = await this.userModel.find().populate('role');
      return users.map(formatUser);
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  // 🔹 GET USER SUBSCRIPTION
  async getUserSubscription(userId: string) {
    const subscription = await this.subscriptionModel
      .findOne({ user: userId })
      .populate({
        path: 'plan',
        select: 'name price interval',
      });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  // 🔹 SET ACTIVE
  async setActive(id: string, isActive: boolean) {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid user ID');
      }

      // 1️⃣ Get user first
      const user = await this.userModel.findById(id).populate('role');

      if (!user) {
        throw new NotFoundException('User not found');
      }
      const role = user.role as any;
      // 2️⃣ Prevent admin toggle
      if (role?.name === 'admin') {
        throw new BadRequestException('Admin status cannot be changed');
      }

      // 3️⃣ Update only if allowed
      user.isActive = isActive;
      await user.save();

      return formatUser(user);
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  // 🔹 UPDATE USER (PARTIAL)
  async updateUser(id: string, dto: any) {
    try {
      if (!dto || Object.keys(dto).length === 0) {
        throw new BadRequestException('No data provided for update');
      }

      const allowedFields = [
        'name',
        'email',
        'stripeCustomerId',
        'isActive',
        'isEmailVerified',
      ];

      const updateData: Record<string, any> = {};

      for (const key of Object.keys(dto)) {
        if (allowedFields.includes(key)) {
          updateData[key] = dto[key];
        }
      }

      if (Object.keys(updateData).length === 0) {
        throw new BadRequestException('No valid fields to update');
      }

      // ✅ Name
      if (updateData.name !== undefined) {
        const name = updateData.name.trim();
        if (!name) {
          throw new BadRequestException('Name cannot be empty');
        }
        updateData.name = name;
      }

      // ✅ Email
      if (updateData.email !== undefined) {
        const email = updateData.email.toLowerCase().trim();

        const exists = await this.userModel.findOne({
          email,
          _id: { $ne: id },
        });

        if (exists) {
          throw new BadRequestException('Email already in use');
        }

        updateData.email = email;
      }

      const user = await this.userModel
        .findByIdAndUpdate(id, updateData, {
          returnDocument: 'after',
          runValidators: true,
        })
        .populate('role');

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return formatUser(user);
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
