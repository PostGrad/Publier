import { Request, Response, NextFunction } from "express";
import { ApiError } from "../errors/ApiError";
import { findSessionByToken } from "../repositories/usersRepository";

/*
 * Session authentication middleware for developer account endpoints.
 * This is separate from API key auth (ADR-001) because:
 * - Session tokens are for account management (short-lived, full access)
 * - API keys are for programmatic access (long-lived, scoped)
 * Keeping them separate follows least privilege principle.
 */
async function sessionAuthHandler(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    throw new ApiError(
      401,
      "UNAUTHORIZED",
      "Missing or invalid Authorization header"
    );
  }

  const token = auth.slice(7);

  // Validate token format (must start with pub_session_)
  if (!token.startsWith("pub_session_")) {
    throw new ApiError(401, "UNAUTHORIZED", "Invalid session token format");
  }

  const session = await findSessionByToken(token);

  if (!session) {
    throw new ApiError(401, "UNAUTHORIZED", "Invalid or expired session");
  }

  (req as any).user = {
    id: session.user_id,
    email: session.email,
    name: session.name,
    sessionId: session.session_id,
  };

  next();
}

export function sessionAuth(req: Request, res: Response, next: NextFunction) {
  sessionAuthHandler(req, res, next).catch(next);
}
