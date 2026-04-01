import { Controller, Get, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Auth } from 'src/decorators';

@Controller('payments')

export class PaymentsController {

    constructor(private paymentsService: PaymentsService) { }

    @Auth('admin')
    @Get()
    async getPayments(@Req() req) {
        return this.paymentsService.getAllPayments();
    }
}