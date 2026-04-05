import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlanDocument = Plan & Document;

@Schema({ timestamps: true })
export class Plan {
  @Prop({ required: true, unique: true }) // Ensure uniqueness in DB
  name: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 0 })
  level: number; // 0: Free, 1: Basic, 2: Premium, 3: Enterprise

  @Prop({
    enum: ['day', 'week', 'month', 'year'],
    required: true,
    default: 'month',
  })
  interval: string;

  @Prop({ default: 1 })
  intervalCount: number;

  @Prop()
  stripeProductId: string;

  @Prop()
  stripePriceId: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [String], default: [] })
  features: string[];
}

export const PlanSchema = SchemaFactory.createForClass(Plan);
