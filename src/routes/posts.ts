import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { ApiError } from "../errors/ApiError";
import { idempotency } from "../middleware/idempotency";
import { createPost } from "../repositories/postsRepository";
import { asyncHandler } from "../utils/asyncHandler";

export const postsRouter = Router();

postsRouter.post(
  "/",
  authenticate("posts:write"),
  idempotency,
  asyncHandler(async (req: Request, res: Response) => {
    const { content, scheduled_at } = req.body || {};
    if (!content || typeof content !== "string") {
      throw new ApiError(400, "INVALID_REQUEST", "content is required");
    }

    let scheduledAt: string | undefined;

    if (scheduled_at !== undefined && scheduled_at !== null) {
      if (typeof scheduled_at !== "string") {
        throw new ApiError(
          400,
          "INVALID_REQUEST",
          "scheduled_at must be an ISO timestamp string"
        );
      }
    
      const date = new Date(scheduled_at);
    
      if (isNaN(date.getTime())) {
        throw new ApiError(
          400,
          "INVALID_REQUEST",
          "scheduled_at must be a valid ISO 8601 timestamp"
        );
      }
    
      if (date <= new Date()) {
        throw new ApiError(
          400,
          "INVALID_REQUEST",
          "scheduled_at must be in the future"
        );
      }
    
      scheduledAt = scheduled_at;
    }

    const post = await createPost({
      content,
      scheduledAt: scheduled_at,
    });

    return res.status(201).json({
      id: post.id,
      status: post.status,
      content: post.content,
      scheduled_at: post.scheduled_at || null,
    });
  })
);
