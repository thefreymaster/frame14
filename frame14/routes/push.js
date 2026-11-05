import { Router } from "express";

/**
 * Notifications on the phones (0.160.0), kept by push.js (app.locals.push):
 *
 *   GET  /api/push/key         — the VAPID public key a browser subscribes with
 *   POST /api/push/subscribe   — a browser's PushSubscription: this device gets
 *                                the notifications. A push service's endpoint
 *                                only; anything else is a 400
 *   POST /api/push/unsubscribe — { endpoint }: it gets them no more
 *   POST /api/push/test        — { endpoint }: a notification to that device
 *                                alone (Settings' Send a test); 404 when it
 *                                isn't subscribed, 502 when the push service
 *                                refused it
 *
 * What gets sent comes from Home Assistant, not from here: an automation
 * fires `frame14_notify` (ha-socket.js).
 */
const router = Router();

router.get("/key", (req, res) => {
  res.json({ publicKey: req.app.locals.push.publicKey() });
});

router.post("/subscribe", (req, res) => {
  const subscription = req.app.locals.push.subscribe(req.body);
  if (!subscription) {
    res.status(400).json({ error: "Not a push subscription from a browser's push service" });
    return;
  }
  res.json({ ok: true });
});

router.post("/unsubscribe", (req, res) => {
  const endpoint = req.body?.endpoint;
  if (typeof endpoint !== "string") {
    res.status(400).json({ error: "endpoint" });
    return;
  }
  res.json({ ok: true, removed: req.app.locals.push.unsubscribe(endpoint) });
});

router.post("/test", async (req, res) => {
  const push = req.app.locals.push;
  const endpoint = req.body?.endpoint;
  if (typeof endpoint !== "string" || !push.has(endpoint)) {
    res.status(404).json({ error: "This device isn't subscribed" });
    return;
  }
  const result = await push.notify(
    {
      title: "Frame14",
      message: "Notifications are on for this device.",
      tag: "frame14-test",
      url: "/control/device",
    },
    { endpoint },
  );
  if (!result?.sent) {
    res.status(502).json({ error: "The push service didn't take it" });
    return;
  }
  res.json({ ok: true });
});

export default router;
