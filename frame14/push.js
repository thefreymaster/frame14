import fs from "node:fs";
import path from "node:path";
import webpush from "web-push";
import { REPO_URL } from "./config.js";
import { DATA_DIR } from "./screen.js";

/**
 * Notifications on the phones (0.160.0): Web Push. A device turns them on in
 * Settings (src/components/NotificationsBoard): its browser subscribes with
 * the push service it uses (Google's, Apple's, Mozilla's, Microsoft's) and
 * hands the subscription over (routes/push.js); a Home Assistant automation
 * fires `frame14_notify` (ha-socket.js's `hooks.onNotify`) and `notify` sends
 * it to every subscribed device, encrypted to each one's keys and signed with
 * the add-on's VAPID key pair. Both live beside the screen's file
 * (screen.js's DATA_DIR): vapid.json, made on the first start, and push.json,
 * the subscriptions with the public key they were made for — new keys (a lost
 * vapid.json) void them all, since the push services check every send
 * against the key a subscription named. A subscription the push service says
 * is gone (404, 410) is dropped.
 */

const KEYS_FILE = path.join(DATA_DIR, "vapid.json");
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, "push.json");

/** At most this many devices; the longest-standing one goes for another. */
export const MAX_SUBSCRIPTIONS = 50;
/** A notification a phone hasn't picked up in this long is dropped (seconds). */
export const NOTIFICATION_TTL_S = 6 * 60 * 60;
const SEND_TIMEOUT_MS = 10_000;

/**
 * One notification to one push service: web-push encrypts it and signs the
 * request (generateRequestDetails), fetch posts it. Resolves to the push
 * service's status.
 */
async function postToPushService(subscription, payload, options) {
  const { endpoint, method, headers, body } = webpush.generateRequestDetails(
    subscription,
    payload,
    options,
  );
  const res = await fetch(endpoint, {
    method,
    headers,
    body,
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
  return { status: res.status, text: res.ok ? "" : await res.text().catch(() => "") };
}

// The browsers' push services. An endpoint is a URL a browser names and the
// server posts to, so only theirs are taken (the server never calls a URL a
// client chose). FRAME14_PUSH_ORIGINS adds exact origins: the tests' stub.
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /(^|\.)push\.apple\.com$/,
  /(^|\.)push\.services\.mozilla\.com$/,
  /\.notify\.windows\.com$/,
];
const B64URL = /^[A-Za-z0-9_-]+={0,2}$/;
// A tap opens a page of the app's own: a path, never another site.
const APP_PATH = /^\/(?![/\\])[^\s\\]*$/;
// The push service keeps one undelivered message per topic.
const TOPIC = /^[A-Za-z0-9_-]{1,32}$/;

/** Whether `endpoint` is a push service's URL. */
export function pushEndpointAllowed(endpoint) {
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  const extra = (process.env.FRAME14_PUSH_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  if (extra.includes(url.origin)) return true;
  return (
    url.protocol === "https:" && PUSH_HOSTS.some((re) => re.test(url.hostname))
  );
}

/** A browser's PushSubscription (its toJSON()), or null when it isn't one. */
export function normaliseSubscription(raw) {
  const endpoint = raw?.endpoint;
  const p256dh = raw?.keys?.p256dh;
  const auth = raw?.keys?.auth;
  if (
    typeof endpoint !== "string" ||
    endpoint.length > 2048 ||
    !pushEndpointAllowed(endpoint)
  ) {
    return null;
  }
  if (typeof p256dh !== "string" || p256dh.length > 128 || !B64URL.test(p256dh)) {
    return null;
  }
  if (typeof auth !== "string" || auth.length > 64 || !B64URL.test(auth)) {
    return null;
  }
  return { endpoint, keys: { p256dh, auth } };
}

/**
 * What a notification carries: `title` and `message` (one at least), a `tag`
 * (a later notification with the same tag replaces it on the phone) and the
 * page a tap opens (`url`, a path; Home without one). Null when there's
 * nothing to say.
 */
export function normaliseNotification(raw) {
  const text = (v, max) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
  const title = text(raw?.title, 120);
  const body = text(raw?.message, 500);
  if (!title && !body) return null;
  const tag = text(raw?.tag, 64);
  const url =
    typeof raw?.url === "string" && raw.url.length <= 512 && APP_PATH.test(raw.url)
      ? raw.url
      : "/home";
  return { title: title ?? "Frame14", body: body ?? "", ...(tag ? { tag } : {}), url };
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return null;
  }
}

function writeJson(file, data) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data));
  } catch (err) {
    console.error(`[push] couldn't save ${file}:`, err.message);
  }
}

function loadKeys() {
  const saved = readJson(KEYS_FILE);
  if (typeof saved?.publicKey === "string" && typeof saved?.privateKey === "string") {
    return saved;
  }
  const keys = webpush.generateVAPIDKeys();
  writeJson(KEYS_FILE, keys);
  console.log("[push] made the VAPID keys");
  return keys;
}

/**
 * The push state. `publicKey()` is the key a browser subscribes with;
 * `subscribe(raw)` keeps a device's subscription (null when it isn't one),
 * `unsubscribe(endpoint)` forgets it, `has(endpoint)` and `count()` read
 * them; `notify(raw, { endpoint })` sends a notification to every device, or
 * to the one endpoint, and resolves to `{ sent, failed }`, or null when the
 * notification is empty.
 */
export function startPush() {
  const keys = loadKeys();
  const saved = readJson(SUBSCRIPTIONS_FILE);
  let subscriptions =
    saved?.publicKey === keys.publicKey && Array.isArray(saved.subscriptions)
      ? saved.subscriptions.map(normaliseSubscription).filter(Boolean)
      : [];
  const save = () =>
    writeJson(SUBSCRIPTIONS_FILE, { publicKey: keys.publicKey, subscriptions });
  const vapidDetails = {
    subject: REPO_URL || "https://github.com/thefreymaster/frame14",
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
  };

  async function deliver(subscription, notification) {
    const host = new URL(subscription.endpoint).host;
    let result;
    try {
      result = await postToPushService(subscription, JSON.stringify(notification), {
        vapidDetails,
        TTL: NOTIFICATION_TTL_S,
        urgency: "high",
        ...(notification.tag && TOPIC.test(notification.tag)
          ? { topic: notification.tag }
          : {}),
      });
    } catch (err) {
      console.warn(`[push] couldn't reach ${host}:`, err.message);
      return false;
    }
    if (result.status >= 200 && result.status < 300) return true;
    if (result.status === 404 || result.status === 410) {
      // The browser unsubscribed, or the push service let it lapse.
      subscriptions = subscriptions.filter(
        (s) => s.endpoint !== subscription.endpoint,
      );
      save();
    } else {
      console.warn(`[push] ${host} refused it:`, result.status, result.text);
    }
    return false;
  }

  return {
    publicKey: () => keys.publicKey,
    count: () => subscriptions.length,
    has: (endpoint) => subscriptions.some((s) => s.endpoint === endpoint),
    subscribe(raw) {
      const subscription = normaliseSubscription(raw);
      if (!subscription) return null;
      subscriptions = [
        ...subscriptions.filter((s) => s.endpoint !== subscription.endpoint),
        subscription,
      ].slice(-MAX_SUBSCRIPTIONS);
      save();
      return subscription;
    },
    unsubscribe(endpoint) {
      const before = subscriptions.length;
      subscriptions = subscriptions.filter((s) => s.endpoint !== endpoint);
      if (subscriptions.length === before) return false;
      save();
      return true;
    },
    async notify(raw, { endpoint } = {}) {
      const notification = normaliseNotification(raw);
      if (!notification) return null;
      const targets = endpoint
        ? subscriptions.filter((s) => s.endpoint === endpoint)
        : subscriptions;
      const results = await Promise.all(
        targets.map((s) => deliver(s, notification)),
      );
      const sent = results.filter(Boolean).length;
      return { sent, failed: results.length - sent };
    },
  };
}
