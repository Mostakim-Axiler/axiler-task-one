
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../database/schemas/users.schema';
import { Role, RoleDocument } from '../../database/schemas/roles.schema';
import { Subscription, SubscriptionDocument } from 'src/database/schemas/subscriptions.schema';
import { formatUser } from 'src/helpers/helpers';
import { FormattedUserData } from './type';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
        @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    ) { }

    // 🔹 Create user with default role = customer
    async create(data: any): Promise<UserDocument> {
        const existingUser = await this.userModel.findOne({ email: data.email });

        if (existingUser) {
            throw new Error('This email is already registered');
        }
        let roleId = data.role;

        if (!roleId) {
            const customerRole = await this.roleModel.findOne({ name: 'customer' });

            if (!customerRole) {
                throw new NotFoundException('Customer role not found');
            }

            roleId = customerRole._id;
        }

        const user = await this.userModel.create({
            ...data,
            role: roleId,
        });

        return user;
    }

    // 🔹 Find user by email (IMPORTANT for login)
    async findByEmail(email: string): Promise<UserDocument | null> {
        return this.userModel
            .findOne({ email })
            .select('+password') // 👈 because password has select: false
            .populate('role'); // optional
    }

    // 🔹 Find by id
    async findById(id: string): Promise<any | null> {
        const user = await this.userModel.findById(id).populate('role');
        return formatUser(user);
    }

    async findAllUsers(): Promise<FormattedUserData[] | []> {
        const users = await this.userModel
            .find()
            .populate('role');

        return users.map(formatUser);
    }
    // Find user subscription
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
    // 🔹 Toggle Active status for user (Admin only)
async setActive(
  id: string,
  isActive: boolean,
): Promise<any> {
  // 🔒 Validate MongoDB ObjectId
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException('Invalid user ID');
  }

  const user = await this.userModel
    .findByIdAndUpdate(
      id,
      { isActive },
      {
        new: true,
        runValidators: true,
      },
    )
    .populate('role');

  // ❌ If user not found
  if (!user) {
    throw new NotFoundException('User not found');
  }

  return formatUser(user);
}
    // 🔹 Update current user info
    async updateUser(
  id: string,
  dto: { name?: string; email?: string },
): Promise<any> {
  // 🔒 Only allow specific fields
  const updateData: any = {};

  if (dto.name) {
    updateData.name = dto.name.trim();
  }

  if (dto.email) {
    const email = dto.email.toLowerCase().trim();

    // 🔍 Check duplicate email
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser && existingUser._id.toString() !== id) {
      throw new BadRequestException('Email already in use');
    }

    updateData.email = email;

    // 💡 Optional: require re-verification
    updateData.isEmailVerified = false;
  }

  const user = await this.userModel
    .findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
    .populate('role'); // ✅ proper populate

  if (!user) {
    throw new NotFoundException('User not found');
  }

  return formatUser(user);
}
}