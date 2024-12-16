import { Router, Request, Response } from "express";

const router = Router();

router.post("/process-tweet", async (req: Request, res: Response) => {
  const { tweetId } = req.body;

  if (!tweetId) {
    res.status(400).json({ error: "Tweet ID is required" });
  }

  try {
    res.json({ status: "processing", tweetId });
  } catch (error) {
    console.error("Error processing tweet:", error);
    res.status(500).json({ error: "Failed to process tweet" });
  }
});

export default router;
