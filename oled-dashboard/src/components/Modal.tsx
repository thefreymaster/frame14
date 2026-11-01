import { createContext, useContext } from "react";
import { Dialog, Drawer } from "@chakra-ui/react";
import { useBottomDrawer } from "../hooks/useBottomDrawer";
import { PAGE_GUTTER } from "../lib/navMetrics";

type ModalKind = { drawer: boolean; full: boolean };

const ModalContext = createContext<ModalKind>({ drawer: false, full: false });

/** A sheet stops a gutter short of the status bar. */
const SHEET_MAX_H = `calc(100dvh - env(safe-area-inset-top, 0px) - ${PAGE_GUTTER})`;

/**
 * Every modal's parts (0.134): a stock Chakra Drawer that comes in from the
 * bottom on a phone (useBottomDrawer), a stock Chakra Dialog everywhere else.
 * Imported as a namespace (`import * as Modal from "./Modal"`) and used as
 * Chakra's Dialog is — `Modal.Root`, `Modal.Content`, … — so a modal is
 * written once. Escape, tap-outside, focus and the animations are the
 * library's either way.
 *
 * On a phone, `size="full"` is a full-height drawer (the thermostat's; the
 * caller pads it clear of the status bar and home indicator); any other size
 * is a sheet as tall as its content, with the cards' `surface` corners at its
 * top, stopping a gutter short of the status bar (a taller one scrolls its
 * body) and padded clear of the home indicator. `placement` and
 * `scrollBehavior` are the dialog's alone.
 */
export function Root({
  placement,
  size,
  scrollBehavior,
  motionPreset,
  ...props
}: Dialog.RootProps) {
  const drawer = useBottomDrawer();
  const full = size === "full";
  return (
    <ModalContext.Provider value={{ drawer, full }}>
      {drawer ? (
        <Drawer.Root
          placement="bottom"
          size={full ? "full" : undefined}
          {...props}
        />
      ) : (
        <Dialog.Root
          placement={placement}
          size={size}
          scrollBehavior={scrollBehavior}
          motionPreset={motionPreset}
          {...props}
        />
      )}
    </ModalContext.Provider>
  );
}

/** Whether this modal is a phone's drawer. */
function useDrawer() {
  return useContext(ModalContext).drawer;
}

export function Content({ maxH, pb, ...props }: Dialog.ContentProps) {
  const { drawer, full } = useContext(ModalContext);
  if (!drawer) return <Dialog.Content maxH={maxH} pb={pb} {...props} />;
  // A caller's undefined (a dialog-only prop) keeps the sheet's own.
  const sheet = !full;
  return (
    <Drawer.Content
      roundedTop={sheet ? "surface" : undefined}
      maxH={maxH ?? (sheet ? SHEET_MAX_H : undefined)}
      pb={pb ?? (sheet ? "env(safe-area-inset-bottom, 0px)" : undefined)}
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

export function Backdrop(props: Dialog.BackdropProps) {
  return useDrawer() ? (
    <Drawer.Backdrop {...props} />
  ) : (
    <Dialog.Backdrop {...props} />
  );
}

export function Positioner(props: Dialog.PositionerProps) {
  return useDrawer() ? (
    <Drawer.Positioner {...props} />
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
