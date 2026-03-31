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

// 🔹 Enum for interval
export enum PlanInterval {
    FREE = 'free',
    MONTHLY = 'monthly',
    YEARLY = 'yearly',
}

// 🔹 Create Plan DTO
export class CreatePlanDto {
    @IsString()
    @IsNotEmpty()
    readonly name: string;

    // ✅ If interval is provided and NOT free → price required
    @ValidateIf((o) => o.interval !== PlanInterval.FREE)
    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    readonly price?: number;

    @IsEnum(PlanInterval)
    @IsNotEmpty()
    readonly interval: PlanInterval;

    @IsString()
    @IsOptional()
    readonly stripePriceId?: string;

    @IsBoolean()
    @IsOptional()
    readonly isActive?: boolean;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    readonly features?: string[];
}

// 🔹 Update Plan DTO
export class UpdatePlanDto {
    @IsString()
    @IsOptional()
    readonly name?: string;

    // ✅ If interval is provided and NOT free → price required
    @ValidateIf((o) => o.interval !== undefined && o.interval !== PlanInterval.FREE)
    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    readonly price?: number;

    @IsEnum(PlanInterval)
    @IsOptional()
    readonly interval?: PlanInterval;

    @IsString()
    @IsOptional()
    readonly stripePriceId?: string;

    @IsBoolean()
    @IsOptional()
    readonly isActive?: boolean;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    readonly features?: string[];
}