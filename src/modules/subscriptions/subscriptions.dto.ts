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
    IsEmail,
} from 'class-validator';

export class CheckoutPlanDto {
    @IsString()
    @IsNotEmpty()
    readonly name: string;

    @IsString()
    @IsNotEmpty()
    @IsEmail()
    readonly email: string;

    @IsString()
    @IsNotEmpty()
    readonly planId: string;

}

export class ChangePlanDto {
    @IsString()
    @IsNotEmpty()
    readonly userId: string;

    @IsString()
    @IsNotEmpty()
    readonly planId: string;
}