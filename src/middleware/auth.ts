import { Request, Response, NextFunction } from "express";
import { ApiError } from "../errors/ApiError";

const VALID_KEYS = new Map([
  ["pub_test_123", ["posts:write", "posts:read", "analytics:read"]],
]);

export function authenticate(requiredScope: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const auth = req.headers.authorization;

    if (!auth) {
      throw new ApiError(401, "UNAUTHORIZED", "Missing Authorization header");
    }

    const token = auth.replace("Bearer ", "");
    const scopes = VALID_KEYS.get(token);

    if (!scopes) {
      throw new ApiError(401, "UNAUTHORIZED", "Invalid API key");
    }

    if (!scopes.includes(requiredScope)) {
      throw new ApiError(403, "FORBIDDEN", "Insufficient permissions");
    }
    next();
  };
}
