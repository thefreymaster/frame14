import { Router } from "express";
import { setLastRoute } from "../ha-motion.js";

const router = Router();

router.get("/change/:view", (req, res) => {
  const { view } = req.params;
  const io = req.app.locals.io;
  io.currentView = view;
  console.log({ event: "change_view", view });
  io.emit("change_view", view);
  if (view !== "blank") setLastRoute(view);
  res.sendStatus(200);
});

export default router;
