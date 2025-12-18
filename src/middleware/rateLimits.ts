import { Request, Response, NextFunction } from "express";
import { redis } from "../infra/redis";
import { ApiError } from "../errors/ApiError";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 100;

export async function rateLimit(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const apiKey = req.headers.authorization;

  if (!apiKey) {
    return next();
  }

  const key = `rate:${apiKey}:${Math.floor(
    Date.now() / 1000 / WINDOW_SECONDS
  )}`;

  try {
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }

    if (count > MAX_REQUESTS) {
      return next(
        new ApiError(
          429,
          "RATE_LIMITED",
          "Too many requests. Please retry later."
        )
      );
    }

    next();
  } catch (err) {
    // Fail open: don't block traffic if Redis fails
    next();
  }
}
