import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { appConfig } from './config';
import { connectDatabase, disconnectDatabase } from './database/prisma.client';
import { logger } from './shared/logger/pino.logger';

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();
    const server = app.listen(appConfig.port, () => {
      logger.info(
        {
          port: appConfig.port,
          environment: appConfig.env,
        },
        'Server started successfully',
      );
    });

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received, shutting down gracefully`);
      server.close(async () => {
        await disconnectDatabase();
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
};

startServer();