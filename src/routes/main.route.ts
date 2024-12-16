import { Router, Request, Response } from "express";
import { main } from "../controllers/main.controller";

const router = Router();

router.get("/mock", async (req: Request, res: Response) => {
  await main();

  res.json({
    status: "success",
    message: "Mock router",
    timestamp: new Date().toISOString(),
  });
});

export default router;
