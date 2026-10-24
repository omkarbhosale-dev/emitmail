import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { sendError, ApiErrorDetail } from '../utils/response.js';
import { env } from '../config/env.js';

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const errorDetails: ApiErrorDetail[] = err.errors.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    sendError(res, 'Validation failed', 400, errorDetails);
    return;
  }

  // Handle JSON parse errors
  if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
    sendError(res, 'Malformed JSON in request body', 400);
    return;
  }

  // Handle Prisma Database Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target)
        ? (err.meta?.target as string[]).join(', ')
        : 'Unique field';
      sendError(
        res,
        `A record with this ${target} already exists.`,
        409,
        [{ message: `Unique constraint failed on field(s): ${target}` }]
      );
      return;
    }
    if (err.code === 'P2025') {
      sendError(res, 'Record not found', 404);
      return;
    }
  }

  // General server error
  const message =
    err instanceof Error ? err.message : 'An unexpected server error occurred';

  if (env.NODE_ENV !== 'test') {
    console.error('Unhandled error caught in error.middleware:', err);
  }

  sendError(res, message, 500);
};
