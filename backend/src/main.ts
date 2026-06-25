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
  const corsOrigins = configService.get<string>('CORS_ORIGINS', '*');
  const allowedOrigins = corsOrigins === '*' ? null : corsOrigins.split(',').map(s => s.trim());

  // CORS — must be the very first middleware so it intercepts OPTIONS
  // preflight before helmet or any route handler sees the request.
  app.use((req: any, res: any, next: any) => {
    const origin = req.headers.origin as string | undefined;
    const allow = !allowedOrigins || (origin && allowedOrigins.includes(origin));
    if (allow && origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-API-Key');
    if (req.method === 'OPTIONS') return res.status(204).send();
    next();
  });

  // Security (after CORS so preflight isn't blocked)
  app.use(helmet({
    contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
  }));

  // Compression
  app.use(compression());

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

