import { Router } from "express";

const router = Router();

router.get("/change/:view", (req, res) => {
  const { view } = req.params;
  const io = req.app.locals.io;
  console.log({ event: "change_view", view });
  io.emit("change_view", view);
  res.sendStatus(200);
});

export default router;
