import { Request, Response, NextFunction } from "express";
import { redis } from "../infra/redis";
import { ApiError } from "../errors/ApiError";

const IDEMPOTENCY_TTL_SECONDS =
  Number(process.env.IDEMPOTENCY_TTL_SECONDS) || 600;

export async function idempotency(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const key = req.headers["idempotency-key"] as string;

  if (!key) {
    return next();
  }
  const apiKey = req.headers.authorization;

  const redisKey = `idempotency:${apiKey}:${req.method}:${req.originalUrl}:${key}`;

  let cached: string | null = null;

  try {
    cached = await redis.get(redisKey);
  } catch (error) {}

  if (cached) {
    const parsed = JSON.parse(cached);
    return res.status(parsed.status).json(parsed.body);
  }

  // Monkey-patch res.json to capture response
  const originalJson = res.json.bind(res);

  res.json = (body: any) => {
    const payload = {
      status: res.statusCode,
      body,
    };

    redis
      .setEx(redisKey, IDEMPOTENCY_TTL_SECONDS, JSON.stringify(payload))
      .catch(() => {});

    return originalJson(body);
  };

  next();
}
