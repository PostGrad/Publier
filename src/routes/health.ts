import { Router, Request, Response } from "express";
import { pool } from "../infra/db";
import { redis } from "../infra/redis";

export const healthRouter = Router();

/*
GET /v1/health

Readiness check for load balancers and orchestrators.
Verifies that all critical dependencies are available.

This endpoint is NOT authenticated.
Health checks must be accessible to infrastructure components that don't have API keys (load balancers, Kubernetes).

Security note: We don't expose internal details like connection strings or error messages — just "healthy" or "degraded".
*/

healthRouter.get("/", async (_req: Request, res: Response) => {
  const checks: Record<string, "healthy" | "unhealthy"> = {
    database: "unhealthy",
    cache: "unhealthy",
  };

  // Check PostgreSQL
  try {
    await pool.query("SELECT 1");
    checks.database = "healthy";
  } catch {
    // Keep as unhealthy
  }

  // Check Redis
  try {
    await redis.ping();
    checks.cache = "healthy";
  } catch {
    // Keep as unhealthy
  }

  const allHealthy = Object.values(checks).every((s) => s === "healthy");

  // Return 503 if any dependency is down
  // Load balancers use this to route traffic away
  const statusCode = allHealthy ? 200 : 503;

  return res.status(statusCode).json({
    status: allHealthy ? "healthy" : "degraded",
    checks,
    timestamp: new Date().toISOString(),
  });
});
