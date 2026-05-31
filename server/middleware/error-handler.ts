import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : "Internal server error";

  if (statusCode >= 500) {
    console.error(`[ErrorHandler] ${statusCode}:`, err.message, err.stack);
  }

  res.status(statusCode).json({
    error: message,
    code: err.code || "INTERNAL_ERROR",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}

export function createError(statusCode: number, message: string, code?: string): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  error.isOperational = true;
  return error;
}

export function badRequest(message: string): AppError {
  return createError(400, message, "BAD_REQUEST");
}

export function unauthorized(message: string): AppError {
  return createError(401, message, "UNAUTHORIZED");
}

export function forbidden(message: string): AppError {
  return createError(403, message, "FORBIDDEN");
}

export function notFound(message: string): AppError {
  return createError(404, message, "NOT_FOUND");
}

export function conflict(message: string): AppError {
  return createError(409, message, "CONFLICT");
}
