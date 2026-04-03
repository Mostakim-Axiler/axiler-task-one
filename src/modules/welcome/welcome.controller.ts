import { Controller, Get } from '@nestjs/common';

@Controller()
export class WelcomeController {
  @Get()
  welcome(): object {
    return {
      message: '🚀 API is running',
    };
  }
}
