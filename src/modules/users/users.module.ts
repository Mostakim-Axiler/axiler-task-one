//users.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { User, UserSchema } from '../../database/schemas/users.schema';
import { Role, RoleSchema } from '../../database/schemas/roles.schema';
import { UsersService } from './users.service';
import { IsEmailUniqueConstraint } from 'src/validators/unique-email.validator';
import { UsersController } from './users.controller';
import { Subscription, SubscriptionSchema } from 'src/database/schemas/subscriptions.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Subscription.name, schema: SubscriptionSchema }
    ]),
    ConfigModule,

    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  providers: [IsEmailUniqueConstraint, UsersService],
  controllers: [UsersController],
  exports: [UsersService], // 👈 IMPORTANT (used in AuthModule)
})
export class UsersModule { }