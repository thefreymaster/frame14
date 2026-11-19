import { useQuery } from "@tanstack/react-query";

/** GET /api/seen/:id (seen.js, 0.178.0): what a camera saw when a notification went out. */
export interface SeenMoment {
  id: string;
  /** When the notification went out (ISO). */
  at: string;
  camera: string;
  title: string;
  message: string;
  /** The camera's still from that moment; null when the camera gave none. */
  still: string | null;
  /** The automation's clip, once it has sent it: a GIF, or an MP4 / WebM. */
  clip: { url: string; type: string } | null;
}

/** How long after its moment the page waits for the clip (the automation records ~10 s, then converts). */
export const CLIP_WAIT_MS = 3 * 60 * 1000;
const POLL_MS = 2_000;

/** Whether a moment's clip may still come. */
export const clipMayCome = (moment: SeenMoment, now: number) =>
  !moment.clip && now - Date.parse(moment.at) < CLIP_WAIT_MS;

/** The moment, or null once the server says there is no such one (gone, or never). */
async function fetchMoment(id: string): Promise<SeenMoment | null> {
  const res = await fetch(`/api/seen/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Seen fetch failed: ${res.status}`);
  return res.json() as Promise<SeenMoment>;
}

/**
 * A moment for its page, asked again every POLL_MS while its clip may still
 * come — the page opens from the notification seconds before the automation
 * has the clip — and no more after.
 */
export function useSeenMoment(id: string) {
  return useQuery({
    queryKey: ["seen", id],
    queryFn: () => fetchMoment(id),
    refetchInterval: (query) => {
      const moment = query.state.data;
      return moment && clipMayCome(moment, Date.now()) ? POLL_MS : false;
    },
  });
}
