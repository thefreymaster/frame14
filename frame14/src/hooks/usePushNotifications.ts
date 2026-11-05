import { useEffect, useState } from "react";
import {
  currentSubscription,
  disablePush,
  enablePush,
  pushSupport,
  remindServer,
  sendTestPush,
  type PushSupport,
} from "../lib/push";

/**
 * This device's notifications (0.160.0, lib/push): what it can do, whether
 * they're on — read from the browser's own subscription, which is reminded
 * to the server each time, so a server that lost it gets it back — and the
 * Settings card's actions. Each resolves once done; a failure rejects.
 */
export function usePushNotifications(): {
  support: PushSupport;
  /** On for this device; null until the browser has said. */
  on: boolean | null;
  busy: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  test: () => Promise<void>;
} {
  const [support, setSupport] = useState<PushSupport>(pushSupport);
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (support !== "available") return;
    let live = true;
    currentSubscription()
      .then((subscription) => {
        if (!live) return;
        setOn(subscription != null);
        if (subscription) void remindServer(subscription).catch(() => {});
      })
      .catch(() => {
        if (live) setOn(false);
      });
    return () => {
      live = false;
    };
  }, [support]);

  async function run(work: () => Promise<void>) {
    setBusy(true);
    try {
      await work();
    } finally {
      setBusy(false);
    }
  }

  return {
    support,
    on: support === "available" ? on : false,
    busy,
    enable: () =>
      run(async () => {
        const granted = await enablePush();
        setOn(granted);
        // Refused: blocked now, or only dismissed and still askable.
        if (!granted) setSupport(pushSupport());
      }),
    disable: () =>
      run(async () => {
        await disablePush();
        setOn(false);
      }),
    test: () => run(sendTestPush),
  };
}
