import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors/app.error';
import { logger } from '../shared/logger/pino.logger';
import { HTTP_STATUS } from '../shared/constants';

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const requestId = res.locals.requestId;

  if (err instanceof AppError && err.isOperational) {
    logger.warn({
      requestId,
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
    });

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      requestId,
    });
    return;
  }
    logger.error({
        requestId,
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: 'Something went wrong. Please try again later.',
    requestId,
  });
};