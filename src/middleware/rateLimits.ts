import { Request, Response, NextFunction } from "express";
import { redis } from "../infra/redis";
import { ApiError } from "../errors/ApiError";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 100;

export async function rateLimit(
  req: Request,
  res: Response,
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

    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS.toString());
    res.setHeader(
      "X-RateLimit-Remaining",
      Math.max(0, MAX_REQUESTS - count).toString()
    );

    if (count > MAX_REQUESTS) {
      res.setHeader("Retry-After", WINDOW_SECONDS.toString());
      return next(
        new ApiError(
          429,
          "RATE_LIMIT_EXCEEDED",
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
