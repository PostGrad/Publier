import { Router, Request, Response } from "express";
import { ApiError } from "../errors/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { sessionAuth } from "../middleware/sessionAuth";
import {
  createApp,
  getAppById,
  listAppsByUser,
  appNameExists,
  updateApp,
  deleteApp,
} from "../repositories/appsRepository";
import { uuidValidation } from "../utils/regexValidations";

export const appsRouter = Router();

// All app routes require session authentication
appsRouter.use(sessionAuth);

appsRouter.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = (req as any).user;
    const { name, description, environment } = req.body || {};

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

    if (name.length > 100) {
      throw new ApiError(
        400,
        "INVALID_REQUEST",
        "name must be less than 100 characters"
      );
    }

    if (description !== undefined && typeof description !== "string") {
      throw new ApiError(
        400,
        "INVALID_REQUEST",
        "description must be a string"
      );
    }

    if (environment !== undefined) {
      if (!["development", "production"].includes(environment)) {
        throw new ApiError(
          400,
          "INVALID_REQUEST",
          "environment must be 'development' or 'production'"
        );
      }
    }

    const exists = await appNameExists(userId, name.trim());
    if (exists) {
      throw new ApiError(
        409,
        "CONFLICT",
        "An app with this name already exists"
      );
    }

    const app = await createApp({
      userId,
      name: name.trim(),
      description: description?.trim(),
      environment,
    });

    return res.status(201).json({
      id: app.id,
      name: app.name,
      description: app.description,
      environment: app.environment,
      created_at: app.created_at,
      updated_at: app.updated_at,
    });
  })
);

appsRouter.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = (req as any).user;

    const apps = await listAppsByUser(userId);

    return res.json({
      data: apps.map((app) => ({
        id: app.id,
        name: app.name,
        description: app.description,
        environment: app.environment,
        created_at: app.created_at,
        updated_at: app.updated_at,
      })),
    });
  })
);

appsRouter.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = (req as any).user;
    const { id } = req.params;

    // UUID validation
    if (!uuidValidation(id)) {
      throw new ApiError(400, "INVALID_REQUEST", "id must be a valid UUID");
    }

    const app = await getAppById(id, userId);

    if (!app) {
      throw new ApiError(404, "NOT_FOUND", "App not found");
    }

    return res.json({
      id: app.id,
      name: app.name,
      description: app.description,
      environment: app.environment,
      created_at: app.created_at,
      updated_at: app.updated_at,
    });
  })
);

appsRouter.patch(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = (req as any).user;
    const { id } = req.params;
    const { name, description } = req.body || {};

    if (!uuidValidation(id)) {
      throw new ApiError(400, "INVALID_REQUEST", "id must be a valid UUID");
    }

    // At least one field must be provided
    if (name === undefined && description === undefined) {
      throw new ApiError(
        400,
        "INVALID_REQUEST",
        "At least one field must be provided: name, description"
      );
    }

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2) {
        throw new ApiError(
          400,
          "INVALID_REQUEST",
          "name must be at least 2 characters"
        );
      }

      // Check uniqueness (excluding current app)
      const existing = await getAppById(id, userId);
      if (existing && existing.name.toLowerCase() !== name.toLowerCase()) {
        const exists = await appNameExists(userId, name.trim());
        if (exists) {
          throw new ApiError(
            409,
            "CONFLICT",
            "An app with this name already exists"
          );
        }
      }
    }

    const app = await updateApp(id, userId, {
      name: name?.trim(),
      description: description?.trim(),
    });

    if (!app) {
      throw new ApiError(404, "NOT_FOUND", "App not found");
    }

    return res.json({
      id: app.id,
      name: app.name,
      description: app.description,
      environment: app.environment,
      created_at: app.created_at,
      updated_at: app.updated_at,
    });
  })
);

/*
 * DELETE is idempotent — deleting a non-existent
 * app returns 404, but deleting twice doesn't cause errors.
 */
appsRouter.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = (req as any).user;
    const { id } = req.params;

    if (!uuidValidation(id)) {
      throw new ApiError(400, "INVALID_REQUEST", "id must be a valid UUID");
    }

    const deleted = await deleteApp(id, userId);

    if (!deleted) {
      throw new ApiError(404, "NOT_FOUND", "App not found");
    }

    // 204 No Content: standard for successful DELETE
    return res.status(204).send();
  })
);
