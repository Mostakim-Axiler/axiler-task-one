import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../database/schemas/users.schema';
import { Role, RoleDocument } from '../../database/schemas/roles.schema';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    ) { }

    // 🔹 Create user with default role = customer
    async create(data: any): Promise<UserDocument> {
        const existingUser = await this.userModel.findOne({ email: data.email });

        if (existingUser) {
            throw new Error('Email already exists');
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

        return user.populate('role');
    }

    // 🔹 Find user by email (IMPORTANT for login)
    async findByEmail(email: string): Promise<UserDocument | null> {
        return this.userModel
            .findOne({ email })
            .select('+password') // 👈 because password has select: false
            .populate('role'); // optional
    }

    // 🔹 Find by id
    async findById(id: string): Promise<UserDocument | null> {
        return this.userModel.findById(id).populate('role');
    }

    async findAllUsers(): Promise<UserDocument[]> {
        return this.userModel
            .find()
            .populate('role');
    }
}