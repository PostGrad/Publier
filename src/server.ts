import "dotenv/config";

import { app } from "./app";
import { connectRedis } from "./infra/redis";
import { connectDB } from "./infra/db";

const port = process.env.PORT || 3000;

async function startServer() {
  await connectDB();
  await connectRedis();
  app.listen(port, () => {
    console.log(`Publier API running on port ${port}`);
  });
}
startServer();
