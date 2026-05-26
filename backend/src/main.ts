import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { WinstonLogger } from './utils/logger.util';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  let app: any;
  try {
    app = await NestFactory.create(AppModule, {
      logger: WinstonLogger,
    });
  } catch (err) {
    logger.warn(`Failed to initialize with full module set: ${err.message}`);
    // If DB is unavailable in dev, we still want the server to start
    // Re-throw if not a DB connection error
    if (!err.message?.includes('connect') && !err.message?.includes('ECONNREFUSED') && !err.message?.includes('password authentication')) {
      throw err;
    }
    logger.warn('Starting in degraded mode (no database). Only fallback auth will work.');
    // Try creating without TypeORM by using a simpler bootstrap
    // For now, re-throw so the process restarts cleanly
    process.exit(1);
  }

  const configService = app.get(ConfigService);
  const port = +(configService.get('APP_PORT') || 3001);
  const nodeEnv = configService.get('NODE_ENV') || 'development';

  // Security
  app.use(helmet({
    contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
  }));

  // Compression
  app.use(compression());

  // CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGINS', '*').split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Swagger docs
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('NSE Market Analytics API')
      .setDescription('AI-Powered NSE Market Data Automation & Analytics Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('market-data', 'NSE market data endpoints')
      .addTag('ai', 'AI analytics endpoints')
      .addTag('watchlist', 'Watchlist management')
      .addTag('admin', 'Admin operations')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
    logger.log(`Swagger docs: http://localhost:${port}/docs`);
  }

  await app.listen(port, '0.0.0.0');
  logger.log(`Application running on port ${port} [${nodeEnv}]`);
}

bootstrap();

