import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const videosDir = path.join(__dirname, "..", "videos");

const router = Router();

router.get("/list", (_req, res) => {
  fs.readdir(videosDir, (err, files) => {
    if (err) {
      res.status(500).json({ error: "Unable to list videos" });
      return;
    }
    res.json(files);
  });
});

router.get("/:file", (req, res, next) => {
  res.sendFile(path.join(videosDir, req.params.file), (err) => {
    if (err) next(err);
  });
});

export default router;
