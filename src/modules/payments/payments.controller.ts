import { Controller, Get, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Auth } from 'src/decorators';

import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
    constructor(private paymentsService: PaymentsService) { }

    @Auth('admin')
    @ApiBearerAuth()
    @Get()
    @ApiOperation({ summary: 'Get all payments (Admin only)' })
    @ApiResponse({
        status: 200,
        description: 'List of all payments',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    async getPayments(@Req() req) {
        return this.paymentsService.getAllPayments();
    }
}