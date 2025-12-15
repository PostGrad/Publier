import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { ApiError } from "../errors/ApiError";
import { idempotency } from "../middleware/idempotency";

export const postsRouter = Router();

postsRouter.post(
  "/",
  authenticate("posts:write"),
  idempotency,
  (req: Request, res: Response) => {
    const { content, scheduled_at } = req.body || {};
    if (!content) {
      throw new ApiError(400, "INVALID_REQUEST", "content is required");
    }

    if (scheduled_at && new Date(scheduled_at) <= new Date()) {
      throw new ApiError(
        400,
        "INVALID_REQUEST",
        "scheduled_at must be in the future"
      );
    }

    return res.status(201).json({
      id: "post_123",
      status: scheduled_at ? "scheduled" : "draft",
      content,
      scheduled_at: scheduled_at || null,
    });
  }
);
