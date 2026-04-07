import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.status(200).json({ ok: true, message: "API is running" });
});

export default router;
