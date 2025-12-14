import express from "express";
import cors from "cors";
import { requestId } from "./middleware/requestId";
import { errorHandler } from "./middleware/errorHandler";
import { postsRouter } from "./routes/posts";

export const app = express();

app.use(cors());
app.use(express.json());
app.use(requestId);

app.use("/v1/posts", postsRouter);

app.use(errorHandler);
