import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AppLogger } from './logger/logger.service';
import { ErrorLoggingInterceptor } from './logger/logger.interceptor';
import { useContainer } from 'class-validator';
import * as express from 'express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ✅ Enable cors
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  app.setGlobalPrefix('api', {
    exclude: ['/'], // exclude root
  });

  app.use(
    '/api/subscriptions/webhook',
    express.raw({ type: 'application/json' }),
  );

  // ✅ Enable DI in validators
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  // ✅ Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ✅ Logger
  const logger = new AppLogger();
  app.useLogger(logger);

  // ✅ Global Error Interceptor
  app.useGlobalInterceptors(new ErrorLoggingInterceptor(logger));

  // =========================
  // ✅ Swagger Configuration
  // =========================
  const config = new DocumentBuilder()
    .setTitle('Simple SASS')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('/', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();