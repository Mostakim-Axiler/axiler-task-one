// users.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ type: Types.ObjectId, ref: 'Role' })
  role: Types.ObjectId;

  @Prop()
  stripeCustomerId: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ type: String, default: null })
  emailVerificationToken: string | null;

  @Prop({ type: Date, default: null })
  emailVerificationExpires: Date | null;

  @Prop({ type: String, default: null })
  passwordResetToken: string | null;

  @Prop({ type: Date, default: null })
  passwordResetExpires: Date | null;

}

export const UserSchema = SchemaFactory.createForClass(User);