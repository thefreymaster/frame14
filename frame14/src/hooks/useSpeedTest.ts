import { useEffect, useRef, useState } from "react";
import { toaster } from "../components/ui/toaster";
import {
  isStopped,
  loadSpeedResult,
  NO_READING,
  runSpeedTest,
  saveSpeedResult,
  speedTestError,
  type SpeedProgress,
  type SpeedResult,
} from "../lib/speedTest";

/**
 * The Speed test page's run (0.167.0): `start` begins one (lib/speedTest),
 * `progress` is its reading while it runs — null otherwise — and `result` the
 * last one finished on this device, kept across visits. `stop` ends a run
 * with nothing kept, and so does leaving the page; one that fails says why
 * in a toast. Either way the last result stays.
 */
export function useSpeedTest() {
  const [result, setResult] = useState<SpeedResult | null>(loadSpeedResult);
  const [progress, setProgress] = useState<SpeedProgress | null>(null);
  // The run under way: what Stop, and leaving the page, cut short.
  const run = useRef<AbortController | null>(null);

  function start() {
    if (run.current) return;
    const controller = new AbortController();
    run.current = controller;
    setProgress({ ...NO_READING, phase: "ping", progress: 0 });
    runSpeedTest({ signal: controller.signal, onProgress: setProgress })
      .then((finished) => {
        saveSpeedResult(finished);
        setResult(finished);
      })
      .catch((error: unknown) => {
        if (isStopped(error)) return;
        toaster.create({
          type: "error",
          title: "The speed test didn't finish",
          description: speedTestError(error),
        });
      })
      .finally(() => {
        if (run.current !== controller) return;
        run.current = null;
        setProgress(null);
      });
  }

  function stop() {
    run.current?.abort();
  }

  useEffect(() => () => run.current?.abort(), []);

  return { progress, result, start, stop };
}
