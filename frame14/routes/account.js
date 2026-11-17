import { Router } from "express";
import { ALIAS_MAX, DEVICES, aliasOf, calledBy } from "../people.js";

/**
 * Who is signed in (0.168.0), for Settings' Account card:
 *
 *   GET /api/account       — { enabled, user, people }: whether people are
 *                            named at all (`cloudflare_access_team`), who
 *                            this caller is — `{ email }` when Cloudflare
 *                            Access signed them in (access.js), null on the
 *                            house's own network — and, for a caller who is
 *                            named, everyone signed in, by device (people.js)
 *   PUT /api/account/alias — { email, device, alias } (0.173.0): the alias
 *                            of one row of that list, kept by the server and
 *                            sent to everyone signed in; "" or null takes it
 *                            away. The GET's answer, as it is now.
 *
 * Access does the signing in, and nothing is refused to a caller who isn't
 * named for reading — they get an answer too, with nobody in it (the user:
 * "It should only show access if the user is using access … If they aren't
 * it should still work"): the card is for those who came through Access, and
 * so are the names. An alias is theirs to set as the list is theirs to read:
 * anyone Access named may alias any row in it (the user: an edit button "to
 * the far right of each"), and nobody else can — who isn't named is told of
 * no row to alias.
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

router.put("/alias", async (req, res) => {
  const { access, people } = req.app.locals;
  res.set("Cache-Control", "no-store");
  if (!access.enabled) {
    res.status(404).json({ error: "Nobody is named here: cloudflare_access_team isn't set" });
    return;
  }
  const user = await access.identify(req.headers);
  if (!user) {
    res.status(403).json({ error: "Only someone Cloudflare Access signed in can set an alias" });
    return;
  }
  const { email, device } = req.body ?? {};
  const alias = aliasOf(req.body?.alias);
  if (typeof email !== "string" || !email || !DEVICES.includes(device) || alias === null) {
    res.status(400).json({
      error: `Expected { email, device, alias }: a row of the list, and an alias of at most ${ALIAS_MAX} characters ("" for none)`,
    });
    return;
  }
  if (!people.setAlias(email, device, alias)) {
    res.status(404).json({ error: "Nobody is signed in on that device" });
    return;
  }
  console.log("[account:alias]", { email, device, alias }, ...calledBy(user));
  res.json({ enabled: true, user, people: people.list() });
});

export default router;
