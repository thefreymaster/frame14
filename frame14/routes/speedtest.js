import { randomBytes } from "node:crypto";
import { Readable, pipeline } from "node:stream";
import { Router } from "express";

// The Speed test page's three calls (0.167.0): a round trip to time, bytes
// to pull and somewhere to push them. They measure the path between the
// device that asks and this server — the Wi-Fi, the LAN, a tunnel — and never
// the internet beyond it; Home Assistant isn't involved.

/** What a download sends when the request doesn't say. */
export const DEFAULT_DOWNLOAD_BYTES = 16 * 1024 * 1024;
/** The most one download sends: a page that wants more asks again. */
export const MAX_DOWNLOAD_BYTES = 128 * 1024 * 1024;

// The download's bytes: random, so nothing on the way can compress them and
// flatter the figure; made once and sent over and over, since making them
// per request would be the slow part on a small Home Assistant host.
const NOISE = randomBytes(1024 * 1024);

// Never from a cache, and never recompressed by a proxy on the way.
const UNCACHED = { "Cache-Control": "no-store, no-transform" };

/** `bytes` of the query as a count: the default without one, null for a bad one. */
function downloadSize(raw) {
  if (raw === undefined) return DEFAULT_DOWNLOAD_BYTES;
  if (typeof raw !== "string" || !/^\d{1,12}$/.test(raw)) return null;
  const bytes = Number(raw);
  return bytes > 0 ? Math.min(bytes, MAX_DOWNLOAD_BYTES) : null;
}

function* noise(bytes) {
  for (let left = bytes; left > 0; left -= NOISE.length) {
    yield left >= NOISE.length ? NOISE : NOISE.subarray(0, left);
  }
}

const router = Router();

// GET /api/speedtest/ping — nothing, at once: the round trip is the answer.
router.get("/ping", (_req, res) => {
  res.set(UNCACHED).status(204).end();
});

// GET /api/speedtest/download?bytes= — that many random bytes, as fast as
// the caller takes them. A caller that leaves midway (the page stops each
// request when its time is up) just ends the stream.
router.get("/download", (req, res) => {
  const bytes = downloadSize(req.query.bytes);
  if (bytes == null) {
    res.status(400).json({ error: "bytes must be a whole number above zero" });
    return;
  }
  res.set({
    ...UNCACHED,
    "Content-Type": "application/octet-stream",
    "Content-Length": String(bytes),
  });
  pipeline(Readable.from(noise(bytes), { objectMode: false }), res, () => {});
});

// POST /api/speedtest/upload — reads the body, keeps none of it, and says
// how much came. A caller that leaves midway gets no answer.
router.post("/upload", (req, res) => {
  const answer = (bytes) => res.set(UNCACHED).json({ bytes });
  // A JSON body was read by express.json() before this ran: nothing is left
  // to count, and no `end` is coming.
  if (req.readableEnded) {
    answer(Number(req.headers["content-length"]) || 0);
    return;
  }
  let bytes = 0;
  req.on("data", (chunk) => {
    bytes += chunk.length;
  });
  req.on("end", () => answer(bytes));
});

export default router;
