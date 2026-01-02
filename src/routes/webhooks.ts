import { Router, Request, Response } from "express";
import { ApiError } from "../errors/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { sessionAuth } from "../middleware/sessionAuth";
import { getAppById } from "../repositories/appsRepository";
import {
  createWebhook,
  listWebhooksByApp,
  getWebhookById,
  deleteWebhook,
  updateWebhookEnabled,
  WEBHOOK_EVENTS,
} from "../repositories/webhooksRepository";
import { uuidValidation } from "../utils/regexValidations";

export const webhooksRouter = Router({ mergeParams: true });

webhooksRouter.use(sessionAuth);

// Helper: verify app ownership
async function verifyAppOwnership(appId: string, userId: string) {
  if (!uuidValidation(appId)) {
    throw new ApiError(400, "INVALID_REQUEST", "appId must be a valid UUID");
  }

  const app = await getAppById(appId, userId);
  if (!app) {
    throw new ApiError(404, "NOT_FOUND", "App not found");
  }

  return app;
}

// POST /v1/apps/:appId/webhooks

webhooksRouter.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = (req as any).user;
    const { appId } = req.params;
    const { url, events } = req.body || {};

    await verifyAppOwnership(appId, userId);

    // Validate URL
    if (!url || typeof url !== "string") {
      throw new ApiError(400, "INVALID_REQUEST", "url is required");
    }

    try {
      new URL(url);
    } catch {
      throw new ApiError(400, "INVALID_REQUEST", "url must be a valid URL");
    }

    if (!url.startsWith("https://")) {
      throw new ApiError(400, "INVALID_REQUEST", "url must use HTTPS");
    }

    // Validate events
    if (events !== undefined) {
      if (!Array.isArray(events)) {
        throw new ApiError(400, "INVALID_REQUEST", "events must be an array");
      }

      const invalidEvents = events.filter((e) => !WEBHOOK_EVENTS.includes(e));
      if (invalidEvents.length > 0) {
        throw new ApiError(
          400,
          "INVALID_REQUEST",
          `Invalid events: ${invalidEvents.join(
            ", "
          )}. Valid events: ${WEBHOOK_EVENTS.join(", ")}`
        );
      }
    }

    const { webhook, secret } = await createWebhook({
      appId,
      url,
      events: events || [],
    });

    return res.status(201).json({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      enabled: webhook.enabled,
      secret, // Shown only once!
      created_at: webhook.created_at,
      _warning: "Store the secret securely. It will not be shown again.",
    });
  })
);

// GET /v1/apps/:appId/webhooks

webhooksRouter.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = (req as any).user;
    const { appId } = req.params;

    await verifyAppOwnership(appId, userId);

    const webhooks = await listWebhooksByApp(appId);

    return res.json({
      data: webhooks.map((w) => ({
        id: w.id,
        url: w.url,
        events: w.events,
        enabled: w.enabled,
        created_at: w.created_at,
        updated_at: w.updated_at,
      })),
    });
  })
);

// PATCH /v1/apps/:appId/webhooks/:webhookId

webhooksRouter.patch(
  "/:webhookId",
  asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = (req as any).user;
    const { appId, webhookId } = req.params;
    const { enabled } = req.body || {};

    await verifyAppOwnership(appId, userId);

    if (enabled === undefined || typeof enabled !== "boolean") {
      throw new ApiError(400, "INVALID_REQUEST", "enabled must be a boolean");
    }

    const webhook = await updateWebhookEnabled(webhookId, appId, enabled);

    if (!webhook) {
      throw new ApiError(404, "NOT_FOUND", "Webhook not found");
    }

    return res.json({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      enabled: webhook.enabled,
      created_at: webhook.created_at,
      updated_at: webhook.updated_at,
    });
  })
);

// DELETE /v1/apps/:appId/webhooks/:webhookId

webhooksRouter.delete(
  "/:webhookId",
  asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = (req as any).user;
    const { appId, webhookId } = req.params;

    await verifyAppOwnership(appId, userId);

    const deleted = await deleteWebhook(webhookId, appId);

    if (!deleted) {
      throw new ApiError(404, "NOT_FOUND", "Webhook not found");
    }

    return res.status(204).send();
  })
);
