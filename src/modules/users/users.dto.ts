import {
  IsOptional,
  IsString,
  IsEmail,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'User full name',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({
    example: 'john@example.com',
    description: 'User email address',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}