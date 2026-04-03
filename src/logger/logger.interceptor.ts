import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AppLogger } from './logger.service';

@Injectable()
export class ErrorLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();

    const request = ctx.getRequest();
    const { method, url, body, user } = request;

    return next.handle().pipe(
      catchError((error) => {
        // 🔥 Structured error log
        this.logger.error(
          'HTTP Exception',
          JSON.stringify({
            method,
            url,
            body,
            user: user?.id || null,
            message: error.message,
            stack: error.stack,
            status: error.status || 500,
            timestamp: new Date().toISOString(),
          }),
        );

        return throwError(() => error);
      }),
    );
  }
}
