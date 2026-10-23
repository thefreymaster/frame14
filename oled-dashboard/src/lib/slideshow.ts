import { useSyncExternalStore } from "react";
import { getDeviceMode } from "./deviceMode";
import { socket } from "./socket";

// The Photos slideshow between devices. Each frame keeps its own place in the
// album (localStorage, per album) and reports the photo it's on; a remote
// sees those in its photo grid and can pick one, which every frame then shows
// and carries on from.

/** localStorage key for the photo an album was last on, on this device. */
const positionKey = (albumId: string) => `photos-position:${albumId}`;

export function loadPosition(albumId: string): string | null {
  try {
    return localStorage.getItem(positionKey(albumId));
  } catch {
    return null;
  }
}

export function savePosition(albumId: string, assetId: string) {
  try {
    localStorage.setItem(positionKey(albumId), assetId);
  } catch {
    // ignore
  }
}

export interface PhotoPick {
  albumId: string;
  assetId: string;
}

const pickListeners = new Set<(pick: PhotoPick) => void>();

/**
 * Called on a frame when a remote picks a photo. The pick is saved as the
 * album's position first, so a frame that isn't on Photos yet (they're sent
 * there with it) starts from it.
 */
export function onPhotoPicked(cb: (pick: PhotoPick) => void) {
  pickListeners.add(cb);
  return () => {
    pickListeners.delete(cb);
  };
}

/** A remote's pick: the frames go to Photos and show this one. */
export function showPhoto(pick: PhotoPick) {
  socket.emit("show_photo", pick);
  socket.emit("change", "photos");
}

/** A frame's slideshow reports the photo it's on, or null when it goes. */
export function reportPhotoShown(assetId: string | null) {
  socket.emit("photo_shown", assetId);
}

socket.on("show_photo", (pick: Partial<PhotoPick> | null) => {
  if (getDeviceMode() === "controller") return;
  const { albumId, assetId } = pick ?? {};
  if (typeof albumId !== "string" || typeof assetId !== "string") return;
  savePosition(albumId, assetId);
  pickListeners.forEach((cb) => cb({ albumId, assetId }));
});

// The photos on the frames right now, as they report them.
let shown: string[] = [];
const shownListeners = new Set<() => void>();

function subscribeShown(cb: () => void) {
  shownListeners.add(cb);
  return () => {
    shownListeners.delete(cb);
  };
}

const getShown = () => shown;

/** Asset ids of the photos the frames are showing (one per frame at most). */
export function usePhotosShown() {
  return useSyncExternalStore(subscribeShown, getShown, getShown);
}

socket.on("photos_shown", (ids: unknown) => {
  if (!Array.isArray(ids)) return;
  shown = ids.filter((id): id is string => typeof id === "string");
  shownListeners.forEach((cb) => cb());
});
