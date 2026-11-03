import { createContext, useContext, useEffect, useRef } from "react";
import { keyframes } from "@emotion/react";
import { Dialog, Drawer, mergeRefs } from "@chakra-ui/react";
import { useBottomDrawer } from "../hooks/useBottomDrawer";
import { PAGE_GUTTER } from "../lib/navMetrics";

type ModalKind = {
  /** Its parts are the Drawer's: a sheet, or a desktop's side panel. */
  drawer: boolean;
  /** The sheet from the bottom (a phone and the frame). */
  sheet: boolean;
  open: boolean;
  close: () => void;
};

const ModalContext = createContext<ModalKind>({
  drawer: false,
  sheet: false,
  open: false,
  close: () => {},
});

/** A sheet stops a gutter short of the status bar. */
const SHEET_MAX_H = `calc(100dvh - env(safe-area-inset-top, 0px) - ${PAGE_GUTTER})`;

/**
 * Every modal's parts (0.134): a stock Chakra Drawer that comes in from the
 * bottom on a phone and the frame (useBottomDrawer: anything but a desktop,
 * since 0.135), a stock Chakra Dialog on a desktop. Imported as a namespace
 * (`import * as Modal from "./Modal"`) and used as Chakra's Dialog is —
 * `Modal.Root`, `Modal.Content`, … — so a modal is written once. Escape,
 * tap-outside, focus and the animations are the library's either way.
 *
 * The drawer is a sheet as tall as its content, whatever the `size` (the
 * user's ask, 0.135: none full height), with the cards' `surface` corners at
 * its top, stopping a gutter short of the status bar (a taller one scrolls
 * its body) and padded clear of the home indicator. It slides down to close
 * — the recipe's fade-out is dropped, as it hid the slide — and a swipe down
 * closes it (useSwipeToClose). `size` is the dialog's and the side panel's;
 * `placement`, `scrollBehavior` and `motionPreset` are the dialog's alone.
 *
 * `side` (0.150.0) makes a desktop's a drawer from the right edge in place
 * of the centred dialog — a panel to read beside the page (the energy and
 * weather details, PanelDialog), where a landscape screen has the width to
 * spare and the cards stay in view at the left. It floats a gutter in from
 * the top, the right and the bottom with the cards' `surface` corners, as
 * the rail does on the other side, and slides in and out past the screen's
 * edge. A control's modal (a light, a fan, a thermostat) and a confirmation
 * stay centred dialogs: small, and opened where the pointer is. A phone and
 * the frame have the sheet either way.
 *
 * `full` (0.144) is the one modal that isn't a sheet anywhere: a full-screen
 * Dialog on every device — the camera's full screen, which is the whole
 * screen by its word (the user: "full screen cameras"), where a sheet is for
 * a panel as tall as its content. Its parts are the Dialog's.
 *
 * Kept quick on the frame (0.135.1, the user: "pretty laggy"): the sheet has
 * its own compositor layer (`will-change: transform`), so the slide and a
 * finger's drag move it without repainting its 1600px of content, and the
 * backdrop only dims — its blur (provider.tsx) went, a full-screen
 * `backdrop-filter` being what the frame's browser recomputed on every frame
 * of the slide. It came back in 0.149.0 on Safari's engine alone (the user:
 * "on a safari device add the backdrop blur back. Be sure not to introduce
 * the bug for android again"), and since 0.150.0 on every browser but
 * Android's (the user: "Can we have the blur behind dialogs and drawers on
 * desktop chrome also? Exclude android"): BACKDROP_BLUR under
 * `<html data-backdrop-blur>` (lib/deviceMode's blursModalBackdrop, set by
 * main.tsx), so an iPhone, an iPad and a desktop blur the page behind a
 * modal and the frame, an Android tablet, never does — nor any Android
 * phone. Without the attribute there is no blur, the frame's side.
 */
export function Root({
  placement,
  size,
  scrollBehavior,
  motionPreset,
  full = false,
  side = false,
  ...props
}: Dialog.RootProps & {
  /** A full-screen dialog on every device, never a sheet. */
  full?: boolean;
  /** On a desktop, a drawer from the right edge, not a centred dialog. */
  side?: boolean;
}) {
  const sheet = useBottomDrawer() && !full;
  const drawer = sheet || (side && !full);
  const { open = false, onOpenChange } = props;
  const kind: ModalKind = {
    drawer,
    sheet,
    open,
    close: () => onOpenChange?.({ open: false }),
  };
  return (
    <ModalContext.Provider value={kind}>
      {sheet ? (
        <Drawer.Root placement="bottom" {...props} />
      ) : drawer ? (
        <Drawer.Root
          placement="end"
          // A dialog's `cover` has no drawer of its own.
          size={typeof size === "string" && size !== "cover" ? size : undefined}
          {...props}
        />
      ) : (
        <Dialog.Root
          placement={placement}
          size={full ? "full" : size}
          scrollBehavior={scrollBehavior}
          motionPreset={motionPreset}
          {...props}
        />
      )}
    </ModalContext.Provider>
  );
}

/** Whether this modal is a drawer. */
function useDrawer() {
  return useContext(ModalContext).drawer;
}

/** Whether this modal is a desktop's side panel. */
function useSide() {
  const { drawer, sheet } = useContext(ModalContext);
  return drawer && !sheet;
}

/** Controls a finger on them drives, not the sheet. */
const SWIPE_IGNORE =
  'button, a, input, select, textarea, [role="slider"], [data-scope="slider"], [data-scope="segment-group"], [data-scope="switch"], [data-swipe-ignore]';
/** Movement before the gesture's direction is read. */
const SWIPE_LOCK_PX = 8;
/** A drag this far down closes the sheet… */
const SWIPE_CLOSE_PX = 120;
/** …or a flick this fast. */
const SWIPE_FLICK_PX_PER_MS = 0.6;
const SWIPE_RETURN_MS = 250;
const SWIPE_LEAVE_MS = 200;

/**
 * Swipe down to close, as a native sheet (0.135, the user's ask). Touch only:
 * the sheets are a phone's and the frame's. The sheet follows the finger
 * once a drag is read as downward (a sideways one is the content's — a
 * chart's scrub; an upward one nothing), and not while the body has scrolled
 * down (the finger scrolls it back first) nor from a control that drags
 * itself (SWIPE_IGNORE: sliders, the dial, the mode selector). Let go past
 * SWIPE_CLOSE_PX, or flicking, and it leaves — slid the rest of the way here
 * (the recipe's exit animation would restart from the top, so `data-swiped`
 * turns it off), then closed; let go short of that and it springs back. A
 * reopened sheet starts clean.
 */
function useSwipeToClose(
  ref: React.RefObject<HTMLDivElement | null>,
  open: boolean,
  close: () => void,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !open) return;
    el.style.transform = "";
    el.style.transition = "";
    delete el.dataset.swiped;

    let startX = 0;
    let startY = 0;
    let lastY = 0;
    let lastT = 0;
    let prevY = 0;
    let prevT = 0;
    let lock: "none" | "sheet" | "off" = "off";
    let scroller: HTMLElement | null = null;

    // The scrolling box under the finger, if any, inside the sheet.
    const scrollerOf = (target: Element | null) => {
      for (let n = target; n && n !== el; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (/auto|scroll/.test(s.overflowY) && n.scrollHeight > n.clientHeight)
          return n as HTMLElement;
      }
      return null;
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const target = e.target as Element;
      lock = target.closest(SWIPE_IGNORE) ? "off" : "none";
      scroller = scrollerOf(target);
      const t = e.touches[0];
      startX = t.clientX;
      startY = lastY = prevY = t.clientY;
      lastT = prevT = e.timeStamp;
      el.style.transition = "";
    };

    const onMove = (e: TouchEvent) => {
      if (lock === "off" || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (lock === "none") {
        if (Math.abs(dx) < SWIPE_LOCK_PX && Math.abs(dy) < SWIPE_LOCK_PX)
          return;
        const sideways = Math.abs(dx) > Math.abs(dy);
        if (sideways || dy < 0 || (scroller && scroller.scrollTop > 0)) {
          lock = "off";
          return;
        }
        lock = "sheet";
      }
      e.preventDefault();
      prevY = lastY;
      prevT = lastT;
      lastY = t.clientY;
      lastT = e.timeStamp;
      el.style.transform = `translateY(${Math.max(0, dy)}px)`;
    };

    const onEnd = () => {
      if (lock !== "sheet") {
        lock = "off";
        return;
      }
      lock = "off";
      const dy = lastY - startY;
      const velocity = lastT > prevT ? (lastY - prevY) / (lastT - prevT) : 0;
      if (dy > SWIPE_CLOSE_PX || velocity > SWIPE_FLICK_PX_PER_MS) {
        el.dataset.swiped = "";
        el.style.transition = `transform ${SWIPE_LEAVE_MS}ms ease-out`;
        el.style.transform = "translateY(100%)";
        let done = false;
        const leave = () => {
          if (done) return;
          done = true;
          el.removeEventListener("transitionend", leave);
          close();
        };
        el.addEventListener("transitionend", leave);
        setTimeout(leave, SWIPE_LEAVE_MS + 50);
      } else {
        el.style.transition = `transform ${SWIPE_RETURN_MS}ms ease`;
        el.style.transform = "translateY(0)";
      }
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    // Not passive: a drag of the sheet stops the body's scroll.
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [ref, open, close]);
}

/**
 * The side panel's way in and out: from past the screen's edge, the gutter
 * it floats in included — the recipe's 100% would leave a gutter's width of
 * it showing at either end of the slide. No fade, as the sheet's.
 */
const SIDE_OFF = `calc(100% + ${PAGE_GUTTER}) 0`;
const sideIn = keyframes`from { translate: ${SIDE_OFF}; } to { translate: 0 0; }`;
const sideOut = keyframes`from { translate: 0 0; } to { translate: ${SIDE_OFF}; }`;

/** The caller's `ref` reaches the element either way (0.142: PanelDialog's initial focus). */
export function Content({
  ref,
  maxH,
  pb,
  css,
  ...props
}: Dialog.ContentProps & { ref?: React.Ref<HTMLDivElement> }) {
  const { drawer, sheet, open, close } = useContext(ModalContext);
  const sheetRef = useRef<HTMLDivElement>(null);
  useSwipeToClose(sheetRef, sheet && open, close);
  if (!drawer)
    return (
      <Dialog.Content ref={ref} maxH={maxH} pb={pb} css={css} {...props} />
    );
  if (!sheet)
    return (
      <Drawer.Content
        ref={ref}
        rounded="surface"
        maxH={maxH}
        pb={pb}
        css={[
          {
            _open: { animationName: `${sideIn}` },
            _closed: { animationName: `${sideOut}` },
          },
          css,
        ]}
        {...props}
      />
    );
  // A caller's undefined (a dialog-only prop) keeps the sheet's own.
  return (
    <Drawer.Content
      ref={mergeRefs(sheetRef, ref)}
      roundedTop="surface"
      maxH={maxH ?? SHEET_MAX_H}
      pb={pb ?? "env(safe-area-inset-bottom, 0px)"}
      css={[
        {
          // Its own layer: the slide and a drag move it, not repaint it.
          willChange: "transform",
          // Down and away, no fade: the recipe's fade-out hid the slide.
          _closed: { animationName: "slide-to-bottom-full" },
          // Swiped away already (useSwipeToClose): nothing left to play.
          "&[data-swiped]": { animationName: "none" },
        },
        css,
      ]}
      {...props}
    />
  );
}

export function Body(props: Dialog.BodyProps) {
  // The dialog body's room under its last line; the drawer's has 0.5rem.
  return useDrawer() ? (
    <Drawer.Body pb="6" {...props} />
  ) : (
    <Dialog.Body {...props} />
  );
}

/**
 * The backdrop's blur, never on Android (0.149.0 / 0.150.0; see Root): 2px,
 * the "minimal and subtle" one it had last (0.135). The prefixed property for
 * an older WebKit, as FROST has it.
 */
const BACKDROP_BLUR = {
  "[data-backdrop-blur] &": {
    backdropFilter: "blur(2px)",
    WebkitBackdropFilter: "blur(2px)",
  },
} as const;

export function Backdrop(props: Dialog.BackdropProps) {
  return useDrawer() ? (
    <Drawer.Backdrop css={BACKDROP_BLUR} {...props} />
  ) : (
    <Dialog.Backdrop css={BACKDROP_BLUR} {...props} />
  );
}

export function Positioner(props: Dialog.PositionerProps) {
  // The side panel floats a gutter in, as the rail does (a caller's padding wins).
  const side = useSide();
  return useDrawer() ? (
    <Drawer.Positioner p={side ? PAGE_GUTTER : undefined} {...props} />
  ) : (
    <Dialog.Positioner {...props} />
  );
}

export function Header(props: Dialog.HeaderProps) {
  return useDrawer() ? (
    <Drawer.Header {...props} />
  ) : (
    <Dialog.Header {...props} />
  );
}

export function Title(props: Dialog.TitleProps) {
  return useDrawer() ? (
    <Drawer.Title {...props} />
  ) : (
    <Dialog.Title {...props} />
  );
}

export function Footer(props: Dialog.FooterProps) {
  return useDrawer() ? (
    <Drawer.Footer {...props} />
  ) : (
    <Dialog.Footer {...props} />
  );
}

export function CloseTrigger(props: Dialog.CloseTriggerProps) {
  return useDrawer() ? (
    <Drawer.CloseTrigger {...props} />
  ) : (
    <Dialog.CloseTrigger {...props} />
  );
}

export function ActionTrigger(props: Dialog.ActionTriggerProps) {
  return useDrawer() ? (
    <Drawer.ActionTrigger {...props} />
  ) : (
    <Dialog.ActionTrigger {...props} />
  );
}
