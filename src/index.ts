import { config } from "dotenv";
import express, { Request, Response } from "express";

import mainRoutes from "./routes/main.route";
import twitterRoutes from "./routes/twitter.route";
import { TwitterService } from "./services/twitter.service";

config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

const twitterService = new TwitterService();

app.use("/api", mainRoutes);
app.use("/api", twitterRoutes);

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, TypeScript with Express!");
});

// Start the Twitter stream
twitterService
  .startListening()
  .then(() => console.log("Twitter service started"))
  .catch((error) => {
    console.error("Failed to start Twitter service:", error);
    process.exit(1);
  });

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
