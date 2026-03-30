import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { IsEmailUnique } from 'src/decorators/email-unique.decorator';

export class SignupDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsEmail()
  @IsNotEmpty()
  @IsEmailUnique()
  readonly email: string;

  @IsString()
  @IsNotEmpty()
  readonly password: string;
}

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  readonly email: string;

  @IsString()
  @IsNotEmpty()
  readonly password: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  readonly refreshToken: string;
}