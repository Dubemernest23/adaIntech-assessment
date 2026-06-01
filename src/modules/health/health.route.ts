import { Router, Request, Response } from 'express';
import { prisma } from '../../database/prisma.client';
import { HTTP_STATUS } from '../../shared/constants';
import { appConfig } from '../../config';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Service is healthy',
      timestamp: new Date().toISOString(),
      environment: appConfig.env,
      services: {
        database: 'connected',
        api: 'running',
      },
    });
  } catch {
    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      success: false,
      message: 'Service unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'disconnected',
        api: 'running',
      },
    });
  }
});

export default router;