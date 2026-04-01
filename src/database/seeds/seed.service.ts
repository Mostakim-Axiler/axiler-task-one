// database/seeds/seed.service.ts
import * as bcrypt from 'bcrypt';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '../schemas/roles.schema';
import { User } from '../schemas/users.schema';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectModel(Role.name) private roleModel: Model<Role>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) { }

  async onModuleInit() {
    await this.seedRoles();
    await this.seedAdmin();
  }

  async seedRoles() {
    const roles = ['admin', 'customer'];

    for (const role of roles) {
      const exists = await this.roleModel.findOne({ name: role });
      if (!exists) {
        await this.roleModel.create({ name: role });
      }
    }
  }

  async seedAdmin() {
    const adminRole = await this.roleModel.findOne({ name: 'admin' });

    if (!adminRole) {
      throw new Error('Admin role not found. Run role seeder first.');
    }

    const existingAdmin = await this.userModel.findOne({
      email: 'admin@example.com',
    });
    const hashedPassword = await bcrypt.hash('admin123', 10);
    if (!existingAdmin) {
      await this.userModel.create({
        name: 'Admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: adminRole._id,
        isEmailVerified: true
      });

      console.log('✅ Admin user created');
    }
  }
}