import {
  Body,
  Controller,
  Post,
  Req,
  Headers,
  Get,
  Param,
} from '@nestjs/common';
import type { Request } from 'express';

import { Auth, Public } from 'src/decorators';
import { SubscriptionsService } from './subscriptions.service';
import { ChangePlanDto, CheckoutPlanDto } from './subscriptions.dto';

import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

    // 🔹 Get all subscriptions (Admin only)
  @Auth('admin')
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Get all subscriptions (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of subscriptions' })
  getAllSubscriptionsAdmin() {
    return this.subscriptionsService.getAllSubscriptionsWithDetails();
  }

  // 🔹 Get individual subscription (Admin only)
  @Auth('admin')
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get subscription by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiResponse({ status: 200, description: 'Subscription details' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  getSubscriptionAdmin(@Param('id') id: string) {
    return this.subscriptionsService.getSubscriptionWithDetails(id);
  }

  // 🔹 Checkout
  @Public()
  @Post('checkout')
  @ApiOperation({ summary: 'Create Stripe checkout session' })
  @ApiBody({ type: CheckoutPlanDto })
  @ApiResponse({ status: 201, description: 'Checkout session created' })
  async checkout(@Body() body: CheckoutPlanDto) {
    return this.subscriptionsService.createCheckoutSession(body);
  }

  // 🔹 Change Plan
  @Auth()
  @ApiBearerAuth()
  @Post('change-plan')
  @ApiOperation({ summary: 'Change user subscription plan' })
  @ApiBody({ type: ChangePlanDto })
  @ApiResponse({ status: 200, description: 'Plan changed successfully' })
  changePlan(@Body() body: ChangePlanDto) {
    return this.subscriptionsService.changePlan(
      body.userId,
      body.planId,
    );
  }

  // 🔹 Stripe Webhook
  @Public()
  @Post('webhook')
  @ApiOperation({
    summary: 'Stripe webhook endpoint (internal use)',
    description: 'Handles Stripe events. Uses raw body.',
  })
  @ApiHeader({
    name: 'stripe-signature',
    required: true,
    description: 'Stripe signature header',
  })
  @ApiResponse({ status: 200, description: 'Webhook received successfully' })
  async webhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    try {
      await this.subscriptionsService.handleWebhook(req, signature);
      return { received: true };
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      return { received: false };
    }
  }
}