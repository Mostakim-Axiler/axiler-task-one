import { Controller, Post, Body, Query, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, SignupDto, RefreshTokenDto } from './auth.dto';
import { Public } from 'src/decorators';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    // -------------------------
    // SIGNUP
    // -------------------------
    @Public()
    @Post('signup')
    async signup(@Body() body: SignupDto) {
        // Returns { accessToken, refreshToken }
        return this.authService.signup(body);
    }

    @Public()
    @Get('verify')
    async verifyEmail(@Query('token') token: string) {
        return this.authService.verifyEmail(token);
    }

    // -------------------------
    // LOGIN
    // -------------------------
    @Public()
    @Post('login')
    async login(@Body() body: LoginDto) {
        // Returns { accessToken, refreshToken }
        return this.authService.login(body);
    }

    // -------------------------
    // REFRESH TOKEN
    // -------------------------
    @Public()
    @Post('refresh')
    async refresh(@Body() body: RefreshTokenDto) {
        const { refreshToken } = body;
        // Verify refresh token and generate new tokens
        return this.authService.refresh(refreshToken);
    }
}