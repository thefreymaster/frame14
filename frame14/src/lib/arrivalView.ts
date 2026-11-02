import { socket as defaultSocket } from "./socket";

/**
 * Where a frame goes when it opens while the frames are on a game, a movie's
 * poster or Halloween (1.0.0). The server routes the frames there with a
 * `change_view` broadcast, which a page that wasn't connected then — a
 * browser opened mid-game, the frame's morning restart, a reload after the
 * server restarted — never heard: it opened on Home and stayed there, with
 * the game on. The server sends the view the frames are on (`current_view`)
 * as each socket connects; the page's first one is taken here, once.
 *
 * Only those three, the views that are up for a reason of their own and end
 * on their own: an everyday view (Home, Lights) is where the frame's own
 * user may have taken it, and blank is the night's, which the next motion
 * wakes from. Halloween only on its two days, since a frame that last showed
 * it on Oct 31 would otherwise reopen on it in November. Never on a remote,
 * which goes where its user takes it, nor on /control, which a frame is on
 * to be set up.
 */
export const ARRIVAL_VIEWS = new Set(["football", "marquee", "halloween"]);

export function arrivalPath(
  view: string,
  at: { remote: boolean; page: string; halloween: boolean },
): string | null {
  if (at.remote || !ARRIVAL_VIEWS.has(view)) return null;
  if (view === "halloween" && !at.halloween) return null;
  if (at.page === "/control" || at.page === `/${view}`) return null;
  return `/${view}`;
}

type Listener = (view: string) => void;
type ArrivalSocket = {
  once: (event: string, fn: (view: unknown) => void) => unknown;
};

/**
 * The page's first `current_view`, listened for as this module loads (main
 * imports it) so a quick connect can't arrive before anyone is listening;
 * `take` hands it over once, now if it's in, else when it comes.
 */
export function createArrivalView(socket: ArrivalSocket) {
  let arrived: string | null = null;
  let taken = false;
  let waiting: Listener | null = null;

  socket.once("current_view", (view) => {
    if (typeof view !== "string") return;
    arrived = view;
    if (waiting && !taken) {
      taken = true;
      waiting(view);
    }
  });

  return function take(fn: Listener): () => void {
    if (taken) return () => {};
    if (arrived != null) {
      taken = true;
      fn(arrived);
      return () => {};
    }
    waiting = fn;
    return () => {
      if (waiting === fn) waiting = null;
    };
  };
}

export const takeArrivalView = createArrivalView(defaultSocket);
