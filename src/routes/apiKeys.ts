import { Router, Request, Response } from "express";
import { ApiError } from "../errors/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { sessionAuth } from "../middleware/sessionAuth";
import { getAppById } from "../repositories/appsRepository";
import {
  createApiKey,
  listApiKeysByApp,
  getApiKeyById,
  deleteApiKey,
  VALID_SCOPES,
} from "../repositories/apiKeysRepository";
import { uuidValidation } from "../utils/regexValidations";

export const apiKeysRouter = Router({ mergeParams: true });

apiKeysRouter.use(sessionAuth);

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

apiKeysRouter.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = (req as any).user;
    const { appId } = req.params;
    const { name, scopes } = req.body || {};

    const app = await verifyAppOwnership(appId, userId);

    if (!name || typeof name !== "string") {
      throw new ApiError(400, "INVALID_REQUEST", "name is required");
    }

    if (name.trim().length < 2) {
      throw new ApiError(
        400,
        "INVALID_REQUEST",
        "name must be at least 2 characters"
      );
    }

    if (!scopes || !Array.isArray(scopes) || scopes.length === 0) {
      throw new ApiError(
        400,
        "INVALID_REQUEST",
        `scopes is required. Valid scopes: ${VALID_SCOPES.join(", ")}`
      );
    }

    const invalidScopes = scopes.filter((s) => !VALID_SCOPES.includes(s));
    if (invalidScopes.length > 0) {
      throw new ApiError(
        400,
        "INVALID_REQUEST",
        `Invalid scopes: ${invalidScopes.join(
          ", "
        )}. Valid scopes: ${VALID_SCOPES.join(", ")}`
      );
    }

    const { key, record } = await createApiKey({
      appId,
      name: name.trim(),
      scopes,
      environment: app.environment,
    });

    return res.status(201).json({
      id: record.id,
      name: record.name,
      key, // Only time the full key is shown
      key_prefix: record.key_prefix,
      scopes: record.scopes,
      expires_at: record.expires_at,
      created_at: record.created_at,
      _warning: "Store this key securely. It will not be shown again.",
    });
  })
);

apiKeysRouter.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = (req as any).user;
    const { appId } = req.params;

    await verifyAppOwnership(appId, userId);

    const keys = await listApiKeysByApp(appId);

    return res.json({
      data: keys.map((k) => ({
        id: k.id,
        name: k.name,
        key_preview: `${k.key_prefix}XXXXX`,
        scopes: k.scopes,
        last_used_at: k.last_used_at,
        expires_at: k.expires_at,
        created_at: k.created_at,
      })),
    });
  })
);

apiKeysRouter.delete(
  "/:keyId",
  asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = (req as any).user;
    const { appId, keyId } = req.params;

    await verifyAppOwnership(appId, userId);

    if (!uuidValidation(keyId)) {
      throw new ApiError(400, "INVALID_REQUEST", "keyId must be a valid UUID");
    }

    const deleted = await deleteApiKey(keyId, appId);

    if (!deleted) {
      throw new ApiError(404, "NOT_FOUND", "API key not found");
    }

    return res.status(204).send();
  })
);
