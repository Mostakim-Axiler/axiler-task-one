import { Controller, Post, Body, Query, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, SignupDto, RefreshTokenDto, VerifyEmailDto } from './auth.dto';
import { Public } from 'src/decorators';

import {
    ApiTags,
    ApiOperation,
    ApiBody,
    ApiQuery,
    ApiResponse,
} from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    // -------------------------
    // SIGNUP
    // -------------------------
    @Public()
    @Post('signup')
    @ApiOperation({ summary: 'User signup' })
    @ApiBody({ type: SignupDto })
    @ApiResponse({
        status: 201,
        description: 'User registered successfully',
    })
    async signup(@Body() body: SignupDto) {
        return this.authService.signup(body);
    }

    // -------------------------
    // VERIFY EMAIL
    // -------------------------
    @Public()
    @Get('verify')
    @ApiOperation({ summary: 'Verify user email' })
    @ApiQuery({
        name: 'token',
        required: true,
        description: 'Email verification token',
        example: 'email_verification_token_here',
    })
    @ApiResponse({
        status: 200,
        description: 'Email verified successfully',
    })
    async verifyEmail(@Query() query: VerifyEmailDto) {
        return this.authService.verifyEmail(query.token);
    }

    // -------------------------
    // LOGIN
    // -------------------------
    @Public()
    @Post('login')
    @ApiOperation({ summary: 'User login' })
    @ApiBody({ type: LoginDto })
    @ApiResponse({
        status: 200,
        description: 'Login successful (returns access + refresh tokens)',
    })
    async login(@Body() body: LoginDto) {
        return this.authService.login(body);
    }

    // -------------------------
    // REFRESH TOKEN
    // -------------------------
    @Public()
    @Post('refresh')
    @ApiOperation({ summary: 'Refresh access token' })
    @ApiBody({ type: RefreshTokenDto })
    @ApiResponse({
        status: 200,
        description: 'New tokens generated',
    })
    async refresh(@Body() body: RefreshTokenDto) {
        const { refreshToken } = body;
        return this.authService.refresh(refreshToken);
    }
}