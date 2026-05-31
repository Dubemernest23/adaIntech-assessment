import { Response } from 'express';
import {HTTP_STATUS} from '../constants/index';

interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  requestId?: string;
}

interface ErrorResponse {
  success: false;
  message: string;
  errors?: unknown;
  requestId?: string;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = HTTP_STATUS.OK,
): void => {
  const response: SuccessResponse<T> = {
    success: true,
    message,
    data,
    requestId: res.locals.requestId,
  };
  res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  errors?: unknown,
): void => {
  const response: ErrorResponse = {
    success: false,
    message,
    ...(errors !== undefined ? { errors } : {}),
    requestId: res.locals.requestId,
  };
  res.status(statusCode).json(response);
};