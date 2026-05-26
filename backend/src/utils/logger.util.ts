import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { join } from 'path';

const logDir = process.env.LOG_DIR || './logs';

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, context, trace }) => {
        return `${timestamp} [${level}] ${context ? `[${context}]` : ''} ${message}${trace ? `\n${trace}` : ''}`;
      }),
    ),
  }),
  new (winston.transports as any).DailyRotateFile({
    filename: join(logDir, 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
  }),
  new (winston.transports as any).DailyRotateFile({
    filename: join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
  }),
];

export const WinstonLogger = WinstonModule.createLogger({
  transports,
});

export const createLogger = (context: string) => {
  return {
    log: (message: string) => console.log(`[${context}] ${message}`),
    error: (message: string, trace?: string) => console.error(`[${context}] ${message}`, trace),
    warn: (message: string) => console.warn(`[${context}] ${message}`),
    debug: (message: string) => console.debug(`[${context}] ${message}`),
  };
};
