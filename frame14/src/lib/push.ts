/**
 * Notifications on this device (0.160.0): Web Push through the service worker
 * (public/sw.js shows them). The browser subscribes with its push service
 * under the add-on's VAPID key (GET /api/push/key) and the server keeps the
 * subscription (POST /api/push/subscribe, push.js); a Home Assistant
 * automation's `frame14_notify` is then sent to it.
 *
 * What a device can do:
 * - `unsupported` — no service worker, PushManager or Notification here (Fully
 *   Kiosk's WebView, an old browser);
 * - `insecure` — not a secure context: push needs https, so the LAN's
 *   http://…:4000 can't, the Cloudflare address can;
 * - `install` — an iPhone or iPad in Safari: Apple gives push only to a
 *   home-screen app;
 * - `denied` — notifications blocked for the site in the browser's settings;
 * - `available` — it can turn them on.
 */
export type PushSupport = "unsupported" | "insecure" | "install" | "denied" | "available";

function appleTouch(): boolean {
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    // iPadOS asks for the desktop site: a Mac with a touch screen.
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}

function homeScreenApp(): boolean {
  return (
    (navigator as { standalone?: boolean }).standalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches === true
  );
}

export function pushSupport(): PushSupport {
  if (!window.isSecureContext) return "insecure";
  const capable =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (appleTouch() && !homeScreenApp()) return "install";
  if (!capable) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "available";
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function post(path: string, body: unknown): Promise<void> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const { error } = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(error ?? `${path} answered ${res.status}`);
  }
}

/** This device's subscription, when it has one and may still be shown them. */
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== "available" || Notification.permission !== "granted") return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

/**
 * Tells the server again about a subscription it may have lost (a new data
 * folder, a device dropped for another): it keeps one copy per endpoint.
 */
export function remindServer(subscription: PushSubscription): Promise<void> {
  return post("/api/push/subscribe", subscription.toJSON());
}

/**
 * Turns them on: asks for permission — first, while the tap that asked is
 * still the browser's user gesture (Safari requires it) — then subscribes
 * under the add-on's key and hands the subscription to the server. Resolves
 * to false when permission isn't given.
 */
export async function enablePush(): Promise<boolean> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;
  const registration = await navigator.serviceWorker.ready;
  const res = await fetch("/api/push/key");
  if (!res.ok) throw new Error(`The add-on's key: ${res.status}`);
  const { publicKey } = (await res.json()) as { publicKey: string };
  // One made under an older key (the add-on's data folder was reset) can't
  // be reused with the new one.
  await (await registration.pushManager.getSubscription())?.unsubscribe();
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes(publicKey),
  });
  await remindServer(subscription);
  return true;
}

/** Turns them off: the server forgets this device, and the browser unsubscribes. */
export async function disablePush(): Promise<void> {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await post("/api/push/unsubscribe", { endpoint: subscription.endpoint });
  await subscription.unsubscribe();
}

/** A notification to this device alone, from the server. */
export async function sendTestPush(): Promise<void> {
  const subscription = await currentSubscription();
  if (!subscription) throw new Error("Notifications aren't on for this device");
  await post("/api/push/test", { endpoint: subscription.endpoint });
}
