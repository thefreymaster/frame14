import { useEffect, useState } from "react";

let cached: string | null = null;
let inflight: Promise<string> | null = null;

async function fetchVersion(): Promise<string> {
  if (cached !== null) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api");
      const data = await res.json();
      cached = typeof data.version === "string" ? data.version : "";
    } catch {
      cached = "";
    }
    return cached!;
  })();
  return inflight;
}

export function useVersion(): string {
  const [version, setVersion] = useState<string>(cached ?? "");

  useEffect(() => {
    fetchVersion().then(setVersion);
  }, []);

  return version;
}
