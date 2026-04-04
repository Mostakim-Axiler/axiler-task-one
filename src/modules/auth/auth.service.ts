import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { EmailService } from '../mail/mail.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);
  constructor(
    private jwtService: JwtService,
    @Inject(forwardRef(() => UsersService)) private usersService: UsersService,
    private emailService: EmailService,
  ) {}

  async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  async comparePassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  }

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

  generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  async verifyRefreshToken(token: string) {
    try {
      return this.jwtService.verify(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async signup(data: any) {
    const hashed = await this.hashPassword(data.password);

    const token = this.generateVerificationToken();

    const user = await this.usersService.create({
      ...data,
      password: hashed,
      isEmailVerified: false,
      emailVerificationToken: token,
      emailVerificationExpires: new Date(Date.now() + 3600000), // 1 hour
    });

    // send async email
    await this.emailService.sendVerificationEmail(user.email, token);

    return {
      message: 'Signup successful. Please verify your email.',
    };
  }

  async verifyEmail(token: string) {
    const user = await this.usersService['userModel'].findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired token');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;

    await user.save();

    return {
      message: 'Email verified successfully',
    };
  }

  async resendVerification(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const token = this.generateVerificationToken();

    user.emailVerificationToken = token;
    user.emailVerificationExpires = new Date(Date.now() + 3600000); // 1 hour

    await user.save();

    // send async email
    await this.emailService.sendVerificationEmail(user.email, token);

    return {
      message: 'Verification email resent successfully',
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    const token = this.generateVerificationToken();

    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour

    await user.save();

    // send async email
    await this.emailService.sendPasswordResetEmail(user.email, token);

    return {
      message: 'Password reset email sent successfully',
    };
  }

  async passwordReset(token: string, newPassword: string) {
    const user = await this.usersService['userModel'].findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired token');
    }

    const hashedPassword = await this.hashPassword(newPassword);

    user.password = hashedPassword;

    user.passwordResetToken = null;
    user.passwordResetExpires = null;

    await user.save();

    return {
      message: 'Password reset successful',
    };
  }

  async login(data: any) {
    const user = await this.usersService.findByEmail(data.email);
    if (!user) throw new BadRequestException('Invalid credentials');

    if (!user.isEmailVerified) {
      throw new BadRequestException({
        message: ['Please verify your email first'],
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    if (!user.isActive) {
      throw new BadRequestException({
        message: ['Your account is deactivated'],
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    const isMatch = await this.comparePassword(data.password, user.password);
    if (!isMatch) throw new BadRequestException('Invalid credentials');

    const tokens = this.generateTokens(user);

    return { ...tokens };
  }

  async refresh(refreshToken: string) {
    // Step 1: Verify the refresh token
    const payload = await this.verifyRefreshToken(refreshToken);

    // Step 2: Find the user from DB (optional but recommended)
    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');

    // Step 3: Generate new tokens
    const tokens = this.generateTokens(user);

    return { ...tokens };
  }
}
