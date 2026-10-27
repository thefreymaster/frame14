import { useSyncExternalStore } from "react";
import { getAutoRefresh } from "./autoRefresh";
import { socket } from "./socket";
import { toaster } from "../components/ui/toaster";

/**
 * Whether this page is the version the add-on has installed. The bundle
 * knows the version it was built as; the server says which one is installed
 * (/api). They differ once the add-on updates under an open page: the server
 * restarts, the socket reconnects, and the page is still the old one. A
 * phone's home-screen app keeps that old page until it's closed out, so the
 * page offers a reload instead: a toast once per new version, and an Update
 * button beside the version on /control. A device with /control's auto
 * refresh on (lib/autoRefresh) reloads itself instead of asking — once per
 * version, so a reload that somehow still comes up old falls back to the
 * toast rather than reloading forever.
 *
 * It checks on every socket connect (the first, and each one after a
 * restart) and when the page comes back into view.
 */

/** The version this page was built as. */
export const RUNNING_VERSION = __APP_VERSION__;

let installed = "";
let toasted = "";
const listeners = new Set<() => void>();

export function reloadApp() {
  window.location.reload();
}

const outdated = (version: string) =>
  version !== "" && RUNNING_VERSION !== "" && version !== RUNNING_VERSION;

// The version this tab last reloaded itself for. Session storage survives
// the reload and nothing else, which is exactly the loop guard's scope.
const REFRESHED_KEY = "auto-refreshed-for";

function refreshedFor(): string {
  try {
    return sessionStorage.getItem(REFRESHED_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Reload for `version` now, unless this tab already did. */
function autoRefresh(version: string): boolean {
  if (!getAutoRefresh() || refreshedFor() === version) return false;
  try {
    sessionStorage.setItem(REFRESHED_KEY, version);
  } catch {
    return false; // Without the guard, don't risk the loop.
  }
  reloadApp();
  return true;
}

async function check() {
  let version: unknown;
  try {
    const res = await fetch("/api", { cache: "no-store" });
    version = (await res.json()).version;
  } catch {
    return; // Offline: the next connect checks again.
  }
  if (typeof version !== "string" || version === installed) return;
  installed = version;
  listeners.forEach((l) => l());

  if (!outdated(version) || autoRefresh(version)) return;
  if (toasted !== version) {
    toasted = version;
    toaster.create({
      id: "app-update",
      type: "info",
      title: "New version available",
      description: `Frame14 ${version} is installed. Refresh to update from ${RUNNING_VERSION}.`,
      duration: Infinity,
      closable: true,
      action: { label: "Refresh", onClick: reloadApp },
    });
  }
}

socket.on("connect", check);
if (socket.connected) check();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") check();
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The running and installed versions, and whether they differ. `installed`
 * is "" until the server has answered.
 */
export function useAppVersion() {
  const version = useSyncExternalStore(subscribe, () => installed);
  return {
    running: RUNNING_VERSION,
    installed: version,
    outdated: outdated(version),
  };
}
