import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailerService } from '@nestjs-modules/mailer';

@Processor('email')
export class EmailProcessor extends WorkerHost {
    constructor(private readonly mailerService: MailerService) {
        super();
    }

    async process(job: Job): Promise<void> {
        const { email, token } = job.data;

        switch (job.name) {
            case 'send-verification-email': {
                const url = `${process.env.FRONTEND_URL}/verify?token=${token}`;

                await this.mailerService.sendMail({
                    to: email,
                    subject: 'Verify Your Email Address',
                    html: `
<div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:20px;">
  <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
    
    <div style="background:#4CAF50; padding:20px; text-align:center; color:white;">
      <h1 style="margin:0;">Welcome 🎉</h1>
    </div>

    <div style="padding:30px; color:#333;">
      <h2>Email Verification</h2>
      <p>Hi there,</p>
      <p>Thanks for signing up! Please confirm your email address by clicking the button below:</p>

      <div style="text-align:center; margin:30px 0;">
        <a href="${url}" 
           style="background:#4CAF50; color:#fff; padding:12px 25px; text-decoration:none; border-radius:5px; font-weight:bold;">
          Verify Email
        </a>
      </div>

      <p>This link will expire in <strong>1 hour</strong>.</p>

      <p>If the button doesn’t work, copy and paste this link into your browser:</p>
      <p style="word-break:break-all; color:#4CAF50;">${url}</p>

      <p>If you didn’t create an account, you can safely ignore this email.</p>

      <p style="margin-top:30px;">— Your Team</p>
    </div>

    <div style="background:#f4f6f8; padding:15px; text-align:center; font-size:12px; color:#777;">
      © ${new Date().getFullYear()} Your Company. All rights reserved.
    </div>

  </div>
</div>
                    `,
                });

                console.log('✅ Verification email sent to:', email);
                break;
            }

            case 'send-reset-password-email': {
                const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

                await this.mailerService.sendMail({
                    to: email,
                    subject: 'Reset Your Password',
                    html: `
<div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:20px;">
  <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
    
    <div style="background:#ff9800; padding:20px; text-align:center; color:white;">
      <h1 style="margin:0;">Password Reset 🔐</h1>
    </div>

    <div style="padding:30px; color:#333;">
      <h2>Reset Your Password</h2>
      <p>Hi,</p>
      <p>We received a request to reset your password. Click the button below to proceed:</p>

      <div style="text-align:center; margin:30px 0;">
        <a href="${url}" 
           style="background:#ff9800; color:#fff; padding:12px 25px; text-decoration:none; border-radius:5px; font-weight:bold;">
          Reset Password
        </a>
      </div>

      <p>This link will expire in <strong>1 hour</strong>.</p>

      <p>If you didn’t request a password reset, you can safely ignore this email.</p>

      <p>If the button doesn’t work, use this link:</p>
      <p style="word-break:break-all; color:#ff9800;">${url}</p>

      <p style="margin-top:30px;">— Your Team</p>
    </div>

    <div style="background:#f4f6f8; padding:15px; text-align:center; font-size:12px; color:#777;">
      © ${new Date().getFullYear()} Your Company. All rights reserved.
    </div>

  </div>
</div>
                    `,
                });

                console.log('✅ Reset password email sent to:', email);
                break;
            }

            default:
                console.warn(`⚠️ Unknown job: ${job.name}`);
        }
    }
}