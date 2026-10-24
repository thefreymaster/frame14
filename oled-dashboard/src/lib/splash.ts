/**
 * The launch splash and its hand-off to the page.
 *
 * index.html draws the splash — the app icon drawing itself in on the page's
 * black / white — on the very first frame, before the bundle has loaded, and
 * marks `<html data-splash="up">`. The page says when it is ready
 * (hooks/useReleaseSplash): /home once every card has its first data, any
 * other page once it has mounted, and either only after its live entity
 * states are in. Then, once the logo has finished drawing in, this flips the
 * attribute to "out": the logo lifts away, the page fades up behind it and
 * /home's cards rise into place in reading order. When that has played, the
 * splash is removed and the attribute cleared. The CSS for all of it is in
 * index.html.
 */

// Never hold a page longer than this after the app starts, whatever it is
// waiting for: with Home Assistant unreachable, /home shows its placeholders.
// (From the app's start, not the page's: on a slow link the bundle alone can
// take longer than this.)
const MAX_WAIT_MS = 3000;
// Don't wait on the hand-off's animations past this; a hidden tab doesn't
// run them.
const ANIMATION_CAP_MS = 2500;
// A card further down than this many doesn't wait any longer to rise.
const MAX_ENTER_ORDER = 8;

const root = document.documentElement;
const splash = document.getElementById("splash");
const appStart = performance.now();
// index.html leaves it down on /blank.
let released = root.dataset.splash !== "up" || splash == null;
if (released) splash?.remove();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

/** These animations' ends. The glint loops for as long as the splash is up,
 *  so it never counts. */
function ended(animations: Animation[]) {
  return Promise.all(
    animations
      .filter((a) => a.effect?.getTiming().iterations !== Infinity)
      .map((a) => a.finished.catch(() => undefined)),
  );
}

/** Number /home's cards top to bottom, then left to right, for the stagger. */
function orderCards(cards: HTMLElement[]) {
  cards
    .map((el) => ({ el, box: el.getBoundingClientRect() }))
    // A card with nothing to show right now is display: none.
    .filter(({ box }) => box.height > 0)
    .sort((a, b) => a.box.top - b.box.top || a.box.left - b.box.left)
    .forEach(({ el }, i) =>
      el.style.setProperty("--enter-order", String(Math.min(i, MAX_ENTER_ORDER))),
    );
}

/**
 * Hand the screen to the page once the logo has drawn in (or at the
 * deadline). Only the first call counts.
 */
export async function releaseSplash() {
  if (released || !splash) return;
  released = true;
  await Promise.race([
    ended(splash.getAnimations({ subtree: true })),
    sleep(appStart + MAX_WAIT_MS - performance.now()),
  ]);

  const cards = [...document.querySelectorAll<HTMLElement>(".home-card")];
  orderCards(cards);
  root.dataset.splash = "out";
  await Promise.race([
    ended([
      ...splash.getAnimations({ subtree: true }),
      ...cards.flatMap((card) => card.getAnimations()),
    ]),
    sleep(ANIMATION_CAP_MS),
  ]);

  splash.remove();
  delete root.dataset.splash;
  cards.forEach((card) => card.style.removeProperty("--enter-order"));
}

setTimeout(() => void releaseSplash(), MAX_WAIT_MS);
