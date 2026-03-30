import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { formatUser } from '../../helpers/helpers';

@Injectable()
export class AuthService {
    private logger = new Logger(AuthService.name);
    constructor(
        private jwtService: JwtService,
        private usersService: UsersService,
    ) { }

    // ------------------------
    // Hash & compare passwords
    // ------------------------
    async hashPassword(password: string) {
        return bcrypt.hash(password, 10);
    }

    async comparePassword(password: string, hash: string) {
        return bcrypt.compare(password, hash);
    }

    // ------------------------
    // Generate tokens
    // ------------------------
    generateTokens(user: any) {
        const payload = { sub: user._id.toString(), role: user.role };

        const accessToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_SECRET,
            expiresIn: '24h', // access token valid 24 hours
        });

        const refreshToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: '30d', // refresh token valid 30 days
        });

        return { accessToken, refreshToken };
    }

    // ------------------------
    // Verify refresh token
    // ------------------------
    async verifyRefreshToken(token: string) {
        try {
            return this.jwtService.verify(token, {
                secret: process.env.JWT_REFRESH_SECRET,
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
    }

    // ------------------------
    // Signup
    // ------------------------
    async signup(data: any) {
        const hashed = await this.hashPassword(data.password);
        const user = await this.usersService.create({
            ...data,
            password: hashed,
        });

        const tokens = this.generateTokens(user);

        return {
            user: formatUser(user),
            ...tokens,
        };
    }

    // ------------------------
    // Login
    // ------------------------
    async login(data: any) {
        const user = await this.usersService.findByEmail(data.email);
        if (!user) throw new UnauthorizedException('Invalid credentials');

        const isMatch = await this.comparePassword(data.password, user.password);
        if (!isMatch) throw new UnauthorizedException('Invalid credentials');

        const tokens = this.generateTokens(user);
        this.logger.log("use logged in");

        return {
            user: formatUser(user),
            ...tokens,
        };
    }

    // ------------------------
    // REFRESH TOKENS
    // ------------------------
    async refresh(refreshToken: string) {
        // Step 1: Verify the refresh token
        const payload = await this.verifyRefreshToken(refreshToken);

        // Step 2: Find the user from DB (optional but recommended)
        const user = await this.usersService.findById(payload.sub);
        if (!user) throw new UnauthorizedException('User not found');

        // Step 3: Generate new tokens
        const tokens = this.generateTokens(user);

        return {
            user: formatUser(user),
            ...tokens,
        };
    }
}