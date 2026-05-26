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

  const app = await NestFactory.create(AppModule, {
    logger: WinstonLogger,
  });

  const configService = app.get(ConfigService);
  const port = +(process.env.PORT || configService.get('APP_PORT') || 3001);
  const nodeEnv = configService.get('NODE_ENV') || 'development';

  // Security
  app.use(helmet({
    contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
  }));

  // Compression
  app.use(compression());

  // CORS — when CORS_ORIGINS=* we reflect the request origin so that
  // credentials: true works (browsers reject wildcard + credentials).
  const corsOrigins = configService.get<string>('CORS_ORIGINS', '*');
  app.enableCors({
    origin: corsOrigins === '*'
      ? (_origin: string | undefined, cb: (e: Error | null, allow?: boolean) => void) => cb(null, true)
      : corsOrigins.split(',').map(s => s.trim()),
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

