import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Disable default body parser to handle multipart manually
  });

  // Get ConfigService instance
  const configService = app.get(ConfigService);

  // Configure body parser to skip multipart/form-data (we'll forward it as raw stream)
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      return next();
    }
    // For other requests, use express body parsers
    express.json({ limit: '50mb' })(req, res, () => {
      express.urlencoded({ extended: true, limit: '50mb' })(req, res, next);
    });
  });

  Logger.log('Environment configuration loaded', 'Bootstrap');
  Logger.log(`Node Environment: ${process.env.NODE_ENV}`, 'Bootstrap');

  const corsOrigin = configService.get('CORS_ORIGIN', '*');
  const allowedOrigins = corsOrigin === '*'
    ? '*'
    : corsOrigin.split(',').map((origin: string) => origin.trim());

  Logger.log(`Enabling CORS with origin: ${JSON.stringify(allowedOrigins)}`, 'Bootstrap');
  
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-User-Id',
    ],
    exposedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  const port = configService.get('PORT', 7001);
  await app.listen(port);

  Logger.log(`🚀 EduWeConnect API Gateway is running on: http://localhost:${port}`);
}

bootstrap();
