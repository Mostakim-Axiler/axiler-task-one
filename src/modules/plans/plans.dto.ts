import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// 🔹 Enum for Plan intervals
export enum PlanInterval {
  DAILY = 'day',
  MONTHLY = 'month',
  YEARLY = 'year',
}

// 🔹 Create Plan DTO
export class CreatePlanDto {
  @ApiProperty({ example: 'Pro Plan' })
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @ApiProperty({
    example: 0, // can be 0
    description: 'Price of the plan, can be 0 for FREE plans',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  readonly price: number;

  @ApiProperty({
    enum: PlanInterval,
    example: PlanInterval.MONTHLY,
  })
  @IsEnum(PlanInterval)
  @IsNotEmpty()
  readonly interval: PlanInterval;

  @ApiProperty({
    example: 1,
    description:
      'Level of the plan (0: Free, 1: Basic, 2: Premium, 3: Enterprise)',
  })
  @IsNumber()
  @Min(0)
  @Max(3)
  @IsNotEmpty()
  readonly level: number;

  @ApiProperty({
    example: ['Unlimited projects', 'Priority support'],
    type: [String],
    description: 'Features included in the plan',
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  readonly features: string[];
}

// 🔹 Update Plan DTO
export class UpdatePlanDto {
  @ApiPropertyOptional({ example: 'Pro Plan Updated' })
  @IsString()
  @IsOptional()
  readonly name?: string;

  @ApiPropertyOptional({
    example: 19.99,
    description: 'Price of the plan, can be 0',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  readonly price?: number;

  @ApiPropertyOptional({
    enum: PlanInterval,
    example: PlanInterval.YEARLY,
  })
  @IsEnum(PlanInterval)
  @IsOptional()
  readonly interval?: PlanInterval;

  @ApiPropertyOptional({
    example: 2,
    description:
      'Level of the plan (0: Free, 1: Basic, 2: Premium, 3: Enterprise)',
  })
  @IsNumber()
  @Min(0)
  @Max(3)
  @IsOptional()
  readonly level?: number;

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
