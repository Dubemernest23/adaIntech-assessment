import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';
import { HTTP_STATUS } from '../shared/constants';

export const validate =
  <T>(schema: ZodType<T>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: 'Validation failed',
        errors,
        requestId: res.locals.requestId,
      });
      return;
    }

    req.body = result.data;
    next();
};