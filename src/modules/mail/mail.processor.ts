import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailerService } from '@nestjs-modules/mailer';

@Processor('email')
export class EmailProcessor extends WorkerHost {
    constructor(private mailerService: MailerService) {
        super();
    }

    async process(job: Job) {
        if (job.name === 'send-verification-email') {
            const { email, token } = job.data;

            const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

            await this.mailerService.sendMail({
                to: email,
                subject: 'Verify your email',
                html: `
          <h2>Email Verification</h2>
          <p>Click below to verify your email:</p>
          <a href="${url}" style="padding:10px 15px; background:#4CAF50; color:#fff;">
            Verify Email
          </a>
          <p>This link expires in 1 hour.</p>
        `,
            });

            console.log('✅ Email sent to:', email);
        }
    }
}