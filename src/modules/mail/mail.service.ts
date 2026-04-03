import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class EmailService {
  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  async sendVerificationEmail(email: string, token: string) {
    await this.emailQueue.add(
      'send-verification-email',
      { email, token },
      {
        attempts: 3, // retry if fails
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
      },
    );
  }

  async sendPasswordResetEmail(email: string, token: string) {
    await this.emailQueue.add(
      'send-reset-password-email',
      { email, token },
      {
        attempts: 3, // retry if fails
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
      },
    );
  }
}
