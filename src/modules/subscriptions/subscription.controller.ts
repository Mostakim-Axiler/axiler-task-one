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
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

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
  @Auth('customer')
  @ApiBearerAuth()
  @Post('checkout')
  @ApiOperation({
    summary: 'Create Stripe checkout session (Authenticated Customer Only)',
  })
  @ApiBody({ type: CheckoutPlanDto })
  @ApiResponse({ status: 201, description: 'Checkout session created' })
  async checkout(@Req() req, @Body() body: CheckoutPlanDto) {
    const userId = req.user.sub as any;
    return this.subscriptionsService.createCheckoutSession(userId, body.planId);
  }

  // 🔹 Change Plan
  @Auth('customer')
  @ApiBearerAuth()
  @Post('change-plan')
  @ApiOperation({
    summary: 'Change user subscription plan (Authenticated Customer Only)',
  })
  @ApiBody({ type: ChangePlanDto })
  @ApiResponse({ status: 200, description: 'Plan changed successfully' })
  changePlan(@Req() req, @Body() body: ChangePlanDto) {
    const userId = req.user.sub as any;
    return this.subscriptionsService.changeSubscription(userId, body.planId);
  }

  // 🔹 Cancel Subscription
  @Auth('customer')
  @ApiBearerAuth()
  @Post('cancel')
  @ApiOperation({
    summary: 'Cancel user subscription (Authenticated Customer Only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription canceled successfully',
  })
  cancelSubscription(@Req() req) {
    const userId = req.user.sub as any;
    return this.subscriptionsService.cancelSubscription(userId);
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
