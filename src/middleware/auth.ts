import { Request, Response, NextFunction } from "express";
import { ApiError } from "../errors/ApiError";
import {
  findApiKeyByHash,
  hashApiKey,
  updateLastUsed,
} from "../repositories/apiKeysRepository";

/*
 * API Key authentication middleware.
 * Validates API keys against the database, checks scopes and verifies expiration.
 * Async middleware because it hits the database. Used wrapper pattern to handle errors properly.
 */

interface AuthenticatedRequest extends Request {
  apiKey?: {
    keyId: string;
    appId: string;
    userId: string;
    scopes: string[];
  };
}

async function authenticateHandler(
  req: AuthenticatedRequest,
  requiredScope: string
): Promise<void> {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    throw new ApiError(
      401,
      "UNAUTHORIZED",
      "Missing or invalid Authorization header"
    );
  }

  const token = auth.slice(7); // Remove "Bearer "

  if (!token.startsWith("pub_live_") && !token.startsWith("pub_test_")) {
    throw new ApiError(401, "UNAUTHORIZED", "Invalid API key format");
  }

  const keyHash = hashApiKey(token);
  const keyData = await findApiKeyByHash(keyHash);

  if (!keyData) {
    throw new ApiError(401, "UNAUTHORIZED", "Invalid API key");
  }

  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    throw new ApiError(401, "UNAUTHORIZED", "API key has expired");
  }

  if (!keyData.scopes.includes(requiredScope)) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      `Insufficient permissions. Required scope: ${requiredScope}`
    );
  }

  req.apiKey = {
    keyId: keyData.key_id,
    appId: keyData.app_id,
    userId: keyData.user_id,
    scopes: keyData.scopes,
  };

  // Update last_used_at (fire-and-forget, don't slow down request)
  updateLastUsed(keyData.key_id).catch(() => {
    // Ignore errors — this is non-critical
  });
}

/*
 * Authentication middleware for a specific scope
 * Usage: authenticate("posts:write")
 */
export function authenticate(requiredScope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    authenticateHandler(req as AuthenticatedRequest, requiredScope)
      .then(() => next())
      .catch(next);
  };
}
