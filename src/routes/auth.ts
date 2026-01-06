import { Router, Request, Response } from "express";
import { ApiError } from "../errors/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { sessionAuth } from "../middleware/sessionAuth";
import {
  createUser,
  findUserByEmail,
  emailExists,
  verifyPassword,
  createSession,
  deleteSession,
  findUserById,
} from "../repositories/usersRepository";
import {
  createVerificationToken,
  verifyEmailWithToken,
} from "../repositories/emailVerificationRepository";
import {
  emailService,
  createVerificationEmail,
} from "../services/emailService";

export const authRouter = Router();

/*
Creates a new developer account.
 */
authRouter.post(
  "/register",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name } = req.body || {};

    if (!email || typeof email !== "string") {
      throw new ApiError(400, "INVALID_REQUEST", "email is required");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ApiError(400, "INVALID_REQUEST", "Invalid email format");
    }

    if (!password || typeof password !== "string") {
      throw new ApiError(400, "INVALID_REQUEST", "password is required");
    }

    if (password.length < 8) {
      throw new ApiError(
        400,
        "INVALID_REQUEST",
        "Password must be at least 8 characters"
      );
    }

    if (name !== undefined && typeof name !== "string") {
      throw new ApiError(400, "INVALID_REQUEST", "name must be a string");
    }

    const exists = await emailExists(email);
    if (exists) {
      throw new ApiError(409, "CONFLICT", "Email already registered");
    }

    const user = await createUser({
      email,
      password,
      name: name || undefined,
    });

    // Generate verification token and send email
    const token = await createVerificationToken(user.id);
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const verificationEmail = createVerificationEmail(email, token, baseUrl);

    await emailService.sendEmail(verificationEmail);

    return res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      email_verified: false,
      created_at: user.created_at,
      _message:
        "Account created successfully. Please check your email to verify your account.",
    });
  })
);

/*
 * Authenticates developer and returns a session token.
 * The session token is shown only once.
 * We store only the hash in the database, so if the DB is
 * compromised, tokens can't be extracted.
 */
authRouter.post(
  "/login",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body || {};

    if (!email || typeof email !== "string") {
      throw new ApiError(400, "INVALID_REQUEST", "email is required");
    }

    if (!password || typeof password !== "string") {
      throw new ApiError(400, "INVALID_REQUEST", "password is required");
    }

    const user = await findUserByEmail(email);

    if (!user) {
      throw new ApiError(401, "UNAUTHORIZED", "Invalid email or password");
    }

    const valid = await verifyPassword(password, user.password_hash);

    if (!valid) {
      throw new ApiError(401, "UNAUTHORIZED", "Invalid email or password");
    }

    const { token, session } = await createSession({
      userId: user.id,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    return res.json({
      token, // Shown only once!
      expires_at: session.expires_at,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  })
);

/*
 * Ends the current session.
 * We return 200 even if the token was already
 * invalid/deleted. This is idempotent — multiple logouts don't fail.
 */
authRouter.post(
  "/logout",
  sessionAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const auth = req.headers.authorization;
    const token = auth!.slice(7);

    await deleteSession(token);

    return res.json({
      message: "Successfully logged out",
    });
  })
);

/*
 * Returns the current authenticated user's information.
 * This endpoint is useful for:
 * - Validating a session token is still valid
 * - Getting fresh user data after updates
 * - Frontend session checks
 */
authRouter.get(
  "/me",
  sessionAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req as any).user;

    const user = await findUserById(id);

    if (!user) {
      throw new ApiError(404, "NOT_FOUND", "User not found");
    }

    return res.json({
      id: user.id,
      email: user.email,
      email_verified: user.email_verified,
      email_verified_at: user.email_verified_at,
      name: user.name,
      created_at: user.created_at,
      updated_at: user.updated_at,
    });
  })
);

/*
 * Verify email address using a token
 */
authRouter.get(
  "/verify-email",
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      throw new ApiError(400, "INVALID_REQUEST", "token is required");
    }

    const userId = await verifyEmailWithToken(token);

    if (!userId) {
      throw new ApiError(
        400,
        "INVALID_REQUEST",
        "Invalid or expired verification token"
      );
    }

    return res.json({
      message: "Email verified successfully",
      user_id: userId,
    });
  })
);

/*
 * Resend verification email
 * Requires authentication
 */
authRouter.post(
  "/resend-verification",
  sessionAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = (req as any).user;

    const user = await findUserById(id);

    if (!user) {
      throw new ApiError(404, "NOT_FOUND", "User not found");
    }

    if (user.email_verified) {
      throw new ApiError(400, "INVALID_REQUEST", "Email already verified");
    }

    // Generate new token and send email
    const token = await createVerificationToken(user.id);
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const verificationEmail = createVerificationEmail(
      user.email,
      token,
      baseUrl
    );

    await emailService.sendEmail(verificationEmail);

    return res.json({
      message: "Verification email sent successfully",
    });
  })
);
