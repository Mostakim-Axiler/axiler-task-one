import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// 🔹 Enum for interval
export enum PlanInterval {
  FREE = 'free',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

// 🔹 Create Plan DTO
export class CreatePlanDto {
  @ApiProperty({ example: 'Pro Plan' })
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @ApiPropertyOptional({
    example: 9.99,
    description: 'Required if interval is not FREE',
    minimum: 0,
  })
  @ValidateIf((o) => o.interval !== PlanInterval.FREE)
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  readonly price?: number;

  @ApiProperty({
    enum: PlanInterval,
    example: PlanInterval.MONTHLY,
  })
  @IsEnum(PlanInterval)
  @IsNotEmpty()
  readonly interval: PlanInterval;

  @ApiPropertyOptional({
    example: 'price_1ABCxyz',
    description: 'Stripe price ID',
  })
  @IsString()
  @IsOptional()
  readonly stripePriceId?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Is plan active',
  })
  @IsBoolean()
  @IsOptional()
  readonly isActive?: boolean;

  @ApiPropertyOptional({
    example: ['Unlimited projects', 'Priority support'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  readonly features?: string[];
}

// 🔹 Update Plan DTO
export class UpdatePlanDto {
  @ApiPropertyOptional({ example: 'Pro Plan Updated' })
  @IsString()
  @IsOptional()
  readonly name?: string;

  @ApiPropertyOptional({
    example: 19.99,
    description: 'Required if interval is provided and not FREE',
    minimum: 0,
  })
  @ValidateIf(
    (o) => o.interval !== undefined && o.interval !== PlanInterval.FREE,
  )
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  readonly price?: number;

  @ApiPropertyOptional({
    enum: PlanInterval,
    example: PlanInterval.YEARLY,
  })
  @IsEnum(PlanInterval)
  @IsOptional()
  readonly interval?: PlanInterval;

  @ApiPropertyOptional({
    example: 'price_1XYZabc',
  })
  @IsString()
  @IsOptional()
  readonly stripePriceId?: string;

  @ApiPropertyOptional({
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  readonly isActive?: boolean;

  @ApiPropertyOptional({
    example: ['Advanced analytics', '24/7 support'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  readonly features?: string[];
}

// 🔹 Set Active DTO
export class SetActiveDto {
  @ApiProperty({
    example: true,
    description: 'Set whether the plan is active or not',
    required: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  readonly isActive: boolean;
}
