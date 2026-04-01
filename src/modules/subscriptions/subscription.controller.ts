import { Body, Controller, Post, Req, Headers } from '@nestjs/common';
import type { Request } from 'express';
import { Auth, Public } from 'src/decorators';
import { SubscriptionsService } from './subscriptions.service';
import { ChangePlanDto, CheckoutPlanDto } from './subscriptions.dto';

@Controller('subscriptions')
export class SubscriptionsController {
    constructor(private subscriptionsService: SubscriptionsService) { }

    @Public()
    @Post('checkout')
    async checkout(@Body() body: CheckoutPlanDto) {
        return this.subscriptionsService.createCheckoutSession(body);
    }

    @Auth()
    @Post('change-plan')
    changePlan(@Body() body: ChangePlanDto) {
        return this.subscriptionsService.changePlan(
            body.userId,
            body.planId,
        );
    }

    @Public()
    @Post('webhook')
    async webhook(
        @Req() req: Request,
        @Headers('stripe-signature') signature: string,
    ) {
        try {
            await this.subscriptionsService.handleWebhook(req, signature);
            return { received: true };
        } catch (error) {
            console.error('Webhook error:', error.message);
            return { received: false };
        }
    }
}