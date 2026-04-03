// welcome.module.ts
import { Module } from '@nestjs/common';
import { WelcomeController } from './welcome.controller';

@Module({
  imports: [],
  controllers: [WelcomeController],
})
export class WelcomeModule {}
