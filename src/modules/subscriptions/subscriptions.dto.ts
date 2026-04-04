import { IsNotEmpty, IsString, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckoutPlanDto {
  @ApiProperty({
    example: '64f1a2b3c4d5e6f7g8h9i0j',
    description: 'Plan ID to subscribe',
  })
  @IsString()
  @IsNotEmpty()
  readonly planId: string;
}

export class ChangePlanDto {
  @ApiProperty({
    example: '64f1a2b3c4d5e6f7g8h9i0a',
    description: 'User ID',
  })
  @IsString()
  @IsNotEmpty()
  readonly userId: string;

  @ApiProperty({
    example: '64f1a2b3c4d5e6f7g8h9i0j',
    description: 'New plan ID',
  })
  @IsString()
  @IsNotEmpty()
  readonly planId: string;
}
