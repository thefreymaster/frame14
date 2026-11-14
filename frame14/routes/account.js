import { Router } from "express";

/**
 * Who is signed in (0.168.0), for Settings' Account card:
 *
 *   GET /api/account — { enabled, user, people }: whether people are named at
 *                      all (`cloudflare_access_team`), who this caller is —
 *                      `{ email }` when Cloudflare Access signed them in
 *                      (access.js), null on the house's own network — and,
 *                      for a caller who is named, everyone signed in, by
 *                      device (people.js)
 *
 * Reading only: Access does the signing in, and nothing is refused to a
 * caller who isn't named — they get an answer too, with nobody in it (the
 * user: "It should only show access if the user is using access … If they
 * aren't it should still work"): the card is for those who came through
 * Access, and so are the names.
 */
const router = Router();

router.get("/", async (req, res) => {
  const { access, people } = req.app.locals;
  // Who is asking differs by caller: nothing in between may keep it.
  res.set("Cache-Control", "no-store");
  if (!access.enabled) {
    res.json({ enabled: false, user: null, people: [] });
    return;
  }
  const user = await access.identify(req.headers);
  res.json({ enabled: true, user, people: user ? people.list() : [] });
});

export default router;
