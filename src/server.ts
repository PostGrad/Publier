import { app } from "./app";
import { connectRedis } from "./infra/redis";
import dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT || 3000;

async function startServer() {
  await connectRedis();

  app.listen(port, () => {
    console.log(`Publier API running on port ${port}`);
  });
}
startServer();
