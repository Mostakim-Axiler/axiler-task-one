import { Controller, Post, Body, Query, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
    LoginDto,
    SignupDto,
    RefreshTokenDto,
    VerifyEmailDto,
    ForgotPasswordDto,
    ResetPasswordDto,
    ResendVerificationDto,
} from './auth.dto';
import { Public } from 'src/decorators';

import {
    ApiTags,
    ApiOperation,
    ApiBody,
    ApiQuery,
    ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

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
    @ApiResponse({ status: 201, description: 'User registered successfully' })
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
    @ApiResponse({ status: 200, description: 'Email verified successfully' })
    async verifyEmail(@Query() query: VerifyEmailDto) {
        return this.authService.verifyEmail(query.token);
    }

    // -------------------------
    // RESEND VERIFICATION
    // -------------------------
    @Throttle({ default: { limit: 3, ttl: 60000 } })
    @Public()
    @Post('resend-verification')
    @ApiOperation({ summary: 'Resend email verification link' })
    @ApiBody({ type: ResendVerificationDto })
    @ApiResponse({
        status: 200,
        description: 'Verification email resent successfully',
    })
    async resendVerification(@Body() body: ResendVerificationDto) {
        return this.authService.resendVerification(body.email);
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
        description: 'Login successful (returns tokens)',
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
    @ApiResponse({ status: 200, description: 'New tokens generated' })
    async refresh(@Body() body: RefreshTokenDto) {
        return this.authService.refresh(body.refreshToken);
    }

    // -------------------------
    // FORGOT PASSWORD
    // -------------------------
    @Throttle({ default: { limit: 3, ttl: 60000 } })
    @Public()
    @Post('forgot-password')
    @ApiOperation({ summary: 'Send password reset email' })
    @ApiBody({ type: ForgotPasswordDto })
    @ApiResponse({
        status: 200,
        description: 'Password reset email sent (if account exists)',
    })
    async forgotPassword(@Body() body: ForgotPasswordDto) {
        return this.authService.forgotPassword(body.email);
    }

    // -------------------------
    // RESET PASSWORD
    // -------------------------
    @Public()
    @Post('reset-password')
    @ApiOperation({ summary: 'Reset user password using token' })
    @ApiBody({ type: ResetPasswordDto })
    @ApiResponse({
        status: 200,
        description: 'Password reset successful',
    })
    async resetPassword(@Body() body: ResetPasswordDto) {
        return this.authService.passwordReset(
            body.token,
            body.newPassword,
        );
    }
}