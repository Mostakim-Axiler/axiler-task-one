// plans.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlanDocument = Plan & Document;

@Schema({ timestamps: true })
export class Plan {
  @Prop({ required: true })
  name: string; // Free, Monthly, Yearly

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ enum: ['free', 'monthly', 'yearly'], required: true })
  interval: string;

  @Prop()
  stripePriceId: string; // from Stripe

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  features: string[];
}

export const PlanSchema = SchemaFactory.createForClass(Plan);
