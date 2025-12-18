import express from "express";
import cors from "cors";
import { requestId } from "./middleware/requestId";
import { errorHandler } from "./middleware/errorHandler";
import { postsRouter } from "./routes/posts";
import { rateLimit } from "./middleware/rateLimits";

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

app.use("/v1/posts", postsRouter);

app.use(errorHandler);
