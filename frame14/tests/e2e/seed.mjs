import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

// What the suite's server has kept before it starts (playwright.config runs
// this ahead of index.js, with the same FRAME14_DATA_DIR): the frames' theme,
// Dark and Gray. An install with nothing saved wears Embossed since 0.176.0
// (theme.js's DEFAULT_THEME; theme.test.js holds that), and the suite is of
// the pages as Gray draws them — every spec that wants another palette wears
// it, and puts Gray back.
const dir = process.env.FRAME14_DATA_DIR;
if (!dir) throw new Error("seed.mjs needs FRAME14_DATA_DIR");
mkdirSync(dir, { recursive: true });
writeFileSync(path.join(dir, "theme.json"), JSON.stringify({ mode: "dark", palette: "gray" }));
