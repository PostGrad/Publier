import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { ApiError } from "../errors/ApiError";
import { idempotency } from "../middleware/idempotency";
import { createPost } from "../repositories/postsRepository";

export const postsRouter = Router();

postsRouter.post(
  "/",
  authenticate("posts:write"),
  idempotency,
  async (req: Request, res: Response) => {
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
  }
);
