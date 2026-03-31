import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AppLogger } from './logger/logger.service';
import { ErrorLoggingInterceptor } from './logger/logger.interceptor';
import { useContainer } from 'class-validator';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    '/subscriptions/webhook',
    express.raw({ type: 'application/json' }),
  );

  // ✅ Enable DI in validators (VERY IMPORTANT for IsEmailUnique)
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  // ✅ Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ✅ Get logger from DI (NOT new AppLogger())
  const logger = new AppLogger();

  app.useLogger(logger);

  // ✅ Global Error Interceptor
  app.useGlobalInterceptors(new ErrorLoggingInterceptor(logger));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();