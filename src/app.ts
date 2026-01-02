import express from "express";
import cors from "cors";
import { requestId } from "./middleware/requestId";
import { errorHandler } from "./middleware/errorHandler";
import { postsRouter } from "./routes/posts";
import { rateLimit } from "./middleware/rateLimits";
import { healthRouter } from "./routes/health";
import { authRouter } from "./routes/auth";
import { appsRouter } from "./routes/apps";
import { apiKeysRouter } from "./routes/apiKeys";
import { webhooksRouter } from "./routes/webhooks";

export const app = express();

app.use(cors());
app.use(express.json());
app.use(requestId);

app.use((req, res, next) => {
  const match = req.originalUrl.match(/^\/v(\d+)/);
  if (match) {
    res.setHeader("X-API-Version", `v${match[1]}`);
  }
  next();
});

app.use(rateLimit);

app.use("/v1/health", healthRouter);

app.use("/v1/auth", authRouter);

app.use("/v1/apps", appsRouter);

app.use("/v1/apps/:appId/keys", apiKeysRouter);

app.use("/v1/apps/:appId/webhooks", webhooksRouter);

app.use("/v1/posts", postsRouter);

app.use(errorHandler);
