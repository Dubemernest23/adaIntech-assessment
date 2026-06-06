import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { requestIdMiddleware } from './middleware/requestid.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { appConfig } from './config';
import { logger } from './shared/logger/pino.logger';
import { HTTP_STATUS } from './shared/constants';
import notificationRoutes from './modules/notifications/notification.routes';
import healthRoutes from './modules/health/health.route';
import { swaggerSpec } from './config/swagger.config';
import eventRoutes from './modules/events/event.routes';
import deliveryRoutes from './modules/delivery/delivery.routes';

const app: Application = express();

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  credentials: true,
}));
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

// Swagger docs
app.use(
  '/api/v1/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'ABP Notification Service API',
  }),
);

// Routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/delivery', deliveryRoutes);

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