import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { ApiError } from "../errors/ApiError";
import { idempotency } from "../middleware/idempotency";
import { createPost } from "../repositories/postsRepository";
import { asyncHandler } from "../utils/asyncHandler";
import { listPosts } from "../repositories/listPostsRepository";

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

postsRouter.get(
  "/",
  authenticate("posts:read"),
  asyncHandler(async (req, res) => {
    const rawLimit = req.query.limit;
    const rawStatus = req.query.status;
    const rawOrder = req.query.order;
    const rawCursor = req.query.cursor;

    // limit
    let limit = 20;
    if (rawLimit !== undefined) {
      const parsed = Number(rawLimit);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new ApiError(
          400,
          "INVALID_REQUEST",
          "limit must be a positive integer"
        );
      }
      limit = Math.min(parsed, 100);
    }

    // status
    let status: string | undefined;
    const allowedStatuses = ["draft", "scheduled", "published", "failed"];

    if (rawStatus !== undefined) {
      if (!allowedStatuses.includes(String(rawStatus))) {
        throw new ApiError(
          400,
          "INVALID_REQUEST",
          `status must be one of: ${allowedStatuses.join(", ")}`
        );
      }
      status = String(rawStatus);
    }

    // order
    let order: "asc" | "desc" = "desc";
    if (rawOrder !== undefined) {
      if (rawOrder !== "asc" && rawOrder !== "desc") {
        throw new ApiError(
          400,
          "INVALID_REQUEST",
          "order must be either 'asc' or 'desc'"
        );
      }
      order = rawOrder;
    }

    // cursor
    let cursor: string | undefined;
    if (rawCursor !== undefined) {
      if (typeof rawCursor !== "string") {
        throw new ApiError(
          400,
          "INVALID_REQUEST",
          "cursor must be an ISO timestamp string"
        );
      }

      const date = new Date(rawCursor);
      if (isNaN(date.getTime())) {
        throw new ApiError(
          400,
          "INVALID_REQUEST",
          "cursor must be a valid ISO 8601 timestamp"
        );
      }

      cursor = rawCursor;
    }

    const rows = await listPosts({
      limit,
      cursor,
      status,
      order,
    });

    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;

    const nextCursor = hasNextPage ? data[data.length - 1].created_at : null;

    res.json({
      data,
      pagination: {
        limit,
        next_cursor: nextCursor,
        has_next_page: hasNextPage,
      },
    });
  })
);
