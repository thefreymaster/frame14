// precompress.mjs — after `vite build`: a .br (brotli 11) and a .gz (gzip 9)
// beside every text file in dist/assets, compressed once here at the best
// ratio, so the server can send them as they are (index.js serves them; its
// compression middleware is for the live responses, at a speed fit for
// those). Vite names the files by content, so a stale pair can't exist, and
// empties dist on each build.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const dir = fileURLToPath(new URL("../dist/assets/", import.meta.url));
const TEXT = new Set([".js", ".css", ".svg", ".json", ".map", ".txt"]);
const kb = (n) => `${(n / 1024).toFixed(0)} kB`;

for (const name of readdirSync(dir)) {
  if (!TEXT.has(extname(name))) continue;
  const file = join(dir, name);
  const raw = readFileSync(file);
  const br = brotliCompressSync(raw, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
      [constants.BROTLI_PARAM_SIZE_HINT]: raw.length,
    },
  });
  const gz = gzipSync(raw, { level: constants.Z_BEST_COMPRESSION });
  writeFileSync(`${file}.br`, br);
  writeFileSync(`${file}.gz`, gz);
  console.log(`${name}: ${kb(raw.length)} → br ${kb(br.length)}, gz ${kb(gz.length)}`);
}
