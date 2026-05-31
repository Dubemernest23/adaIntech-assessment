import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config';
import { AppError } from '../shared/errors/app.error';
import { HTTP_STATUS } from '../shared/constants';

export interface JwtPayload {
  user_id: string;
  tenant_id: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(
        'No token provided',
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;

    if (!decoded.user_id || !decoded.tenant_id || !decoded.role) {
      throw new AppError(
        'Invalid token claims',
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError('Invalid or expired token', HTTP_STATUS.UNAUTHORIZED));
  }
};