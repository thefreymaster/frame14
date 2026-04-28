import { useState, useEffect } from "react";

export type ScreenType = "oled" | "lcd";

let cached: ScreenType | null = null;

async function fetchScreenType(): Promise<ScreenType> {
  if (cached) return cached;
  try {
    const res = await fetch("/api");
    const data = await res.json();
    cached = data.screenType === "lcd" ? "lcd" : "oled";
  } catch {
    cached = "oled";
  }
  return cached!;
}

export function useScreenType(): ScreenType {
  const [screenType, setScreenType] = useState<ScreenType>("oled");

  useEffect(() => {
    fetchScreenType().then(setScreenType);
  }, []);

  return screenType;
}
