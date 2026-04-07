import { useState, useEffect } from "react";

/**
 * Samples the top-left region of an image and returns whether it is
 * perceptually "dark" or "light". Returns null while loading.
 *
 * regionFraction controls what fraction of the image (width × height) is
 * sampled — should match roughly where the overlay sits.
 */
export function useRegionLuminance(
  url: string | null,
  regionFraction = { w: 0.35, h: 0.45 }
): "dark" | "light" | null {
  const [result, setResult] = useState<"dark" | "light" | null>(null);

  useEffect(() => {
    if (!url) return;
    setResult(null);

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const SAMPLE = 120; // canvas resolution for sampling
      const canvas = document.createElement("canvas");
      canvas.width = SAMPLE;
      canvas.height = SAMPLE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);

      const rw = Math.max(1, Math.floor(SAMPLE * regionFraction.w));
      const rh = Math.max(1, Math.floor(SAMPLE * regionFraction.h));
      const { data } = ctx.getImageData(0, 0, rw, rh);

      let total = 0;
      for (let i = 0; i < data.length; i += 4) {
        // Perceived luminance (ITU-R BT.601)
        total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }

      const avg = total / (rw * rh);
      setResult(avg > 140 ? "light" : "dark");
    };

    img.src = url;
  }, [url, regionFraction.w, regionFraction.h]);

  return result;
}
