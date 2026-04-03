import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AppLogger } from './logger/logger.service';
import { ErrorLoggingInterceptor } from './logger/logger.interceptor';
import { useContainer } from 'class-validator';
import * as express from 'express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  // 🔥 Disable default body parser
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // ✅ Stripe raw body ONLY
  app.use(
    '/api/subscriptions/webhook',
    express.raw({ type: 'application/json' }),
  );

  // ✅ Normal parsers for rest of app
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ✅ CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.setGlobalPrefix('api', {
    exclude: ['/'],
  });

  // ✅ Validation
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

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
  app.useGlobalInterceptors(new ErrorLoggingInterceptor(logger));

  // ✅ Swagger
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
