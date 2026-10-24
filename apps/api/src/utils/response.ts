import { Response } from 'express';

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorDetail {
  path?: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: ApiErrorDetail[];
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Operation successful',
  statusCode = 200
): Response => {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    message,
    data,
  };
  return res.status(statusCode).json(payload);
};

export const sendError = (
  res: Response,
  message = 'An unexpected error occurred',
  statusCode = 500,
  errors?: ApiErrorDetail[]
): Response => {
  const payload: ApiErrorResponse = {
    success: false,
    message,
    ...(errors && errors.length > 0 ? { errors } : {}),
  };
  return res.status(statusCode).json(payload);
};
