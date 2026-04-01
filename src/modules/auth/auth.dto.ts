import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { IsEmailUnique } from 'src/decorators/email-unique.decorator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @IsEmailUnique()
  readonly email: string;

  @ApiProperty({ example: 'strongPassword123', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  readonly password: string;
}

export class VerifyEmailDto {
  @ApiProperty({
    example: 'email_verification_token_here',
    description: 'Email verification token sent to user email',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class LoginDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  readonly email: string;

  @ApiProperty({ example: 'strongPassword123' })
  @IsString()
  @IsNotEmpty()
  readonly password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'refresh_token_here' })
  @IsString()
  @IsNotEmpty()
  readonly refreshToken: string;
}