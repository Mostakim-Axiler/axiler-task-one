import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-03-25.dahlia',
    });
  }

  async createPlanPrice(data: {
    name: string;
    price: number;
    interval: 'monthly' | 'yearly';
  }) {
    // 🔹 Create product
    const product = await this.stripe.products.create({
      name: data.name,
    });

    // 🔹 Create price
    const price = await this.stripe.prices.create({
      unit_amount: data.price * 100, // cents
      currency: 'usd',
      recurring: {
        interval: data.interval === 'monthly' ? 'month' : 'year',
      },
      product: product.id,
    });

    return price.id;
  }
}
