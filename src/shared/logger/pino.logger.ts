import pino from 'pino';
import { appConfig } from '../../config';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(appConfig.isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});