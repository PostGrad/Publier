import { Request, Response, NextFunction } from "express";
import { ApiError } from "../errors/ApiError";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const requestId = req.headers["x-request-id"];

  // Log all errors during development
  console.error("─── Error ───────────────────────────────────────");
  console.error("Request ID:", requestId);
  console.error("Path:", req.method, req.originalUrl);
  console.error("Error:", err.message);
  console.error("Stack:", err.stack);
  console.error("─────────────────────────────────────────────────");

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        request_id: requestId,
      },
    });
  }

  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      request_id: requestId,
    },
  });
}
