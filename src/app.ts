import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { requestIdMiddleware } from './middleware/requestid.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { appConfig } from './config';
import { logger } from './shared/logger/pino.logger';
import { HTTP_STATUS } from './shared/constants';

const app: Application = express();


app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestIdMiddleware);
app.use(
  morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  }),
);


app.use('/api/v1/health', (req: Request, res: Response) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Service is healthy',
    timestamp: new Date().toISOString(),
    environment: appConfig.env,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    requestId: res.locals.requestId,
  });
});

// Global error handler
app.use(errorMiddleware);

export default app;