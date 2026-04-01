// payments.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subscription' })
  subscription: Types.ObjectId;

  @Prop()
  stripePaymentIntentId: string;

  @Prop()
  stripeInvoiceId: string;

  @Prop()
  amount: number;

  @Prop()
  currency: string;

  @Prop({
    enum: ['succeeded', 'pending', 'failed'],
  })
  status: string;

  @Prop()
  paidAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);