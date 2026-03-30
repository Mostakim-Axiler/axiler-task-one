// subscriptions.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Plan' })
  plan: Types.ObjectId;

  @Prop()
  stripeSubscriptionId: string;

  @Prop({
    enum: ['active', 'canceled', 'past_due', 'incomplete'],
    default: 'active',
  })
  status: string;

  @Prop()
  currentPeriodStart: Date;

  @Prop()
  currentPeriodEnd: Date;

  @Prop({ default: false })
  cancelAtPeriodEnd: boolean;
}

export const SubscriptionSchema =
  SchemaFactory.createForClass(Subscription);