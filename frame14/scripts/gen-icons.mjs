import sharp from "sharp";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const svg = readFileSync(join(publicDir, "favicon.svg"));

const sizes = [16, 32, 180, 192, 512];

await Promise.all(
  sizes.map((size) =>
    sharp(svg, { density: 300 })
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(join(publicDir, `icon-${size}.png`))
  )
);

console.log("Icons generated:", sizes.map((s) => `icon-${s}.png`).join(", "));
