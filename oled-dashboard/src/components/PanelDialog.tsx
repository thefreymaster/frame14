import { useRef } from "react";
import { Portal } from "@chakra-ui/react";
import { useBottomDrawer } from "../hooks/useBottomDrawer";
import { PAGE_GUTTER } from "../lib/navMetrics";
import * as Modal from "./Modal";
import { CloseButton } from "./ui/close-button";

/**
 * The detail modals' shell: a Modal (a stock Chakra Dialog; on a phone a
 * drawer from the bottom, 0.134) with a title, a body and a close button.
 * Escape, tap-outside and the enter/exit animation are the library's.
 *
 * The caller keeps whatever the panel shows after closing, so the exit
 * animation still has content to draw.
 *
 * A panel taller than the screen scrolls its body, not the whole dialog, so
 * the title and the close button stay put. The dialog keeps clear of the
 * screen's safe areas, with the page gutter around it (in place of the
 * recipe's 3.75rem above and below, which a phone couldn't spare): on an
 * iPhone, a full-height panel once put its close button under the status bar,
 * where it couldn't be tapped, and there was no outside left to tap instead.
 * A phone's drawer keeps clear of them itself (Modal).
 *
 * It opens with the focus on the panel itself (0.142), which draws no ring
 * (the recipes' `outline: 0`). The library's choice is the first tabbable
 * thing inside, and Chromium paints a focus ring on whatever a script
 * focuses when nothing held the focus before — the energy card's trigger is
 * no button, so a tap on it leaves none — which put a ring on the energy
 * detail's Solar tab the moment it opened, and on its close button before
 * the tabs.
 */
export function PanelDialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  const drawer = useBottomDrawer();
  const contentRef = useRef<HTMLDivElement>(null);
  const inset = (side: string) =>
    drawer
      ? undefined
      : `calc(env(safe-area-inset-${side}, 0px) + ${PAGE_GUTTER})`;

  return (
    <Modal.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement="center"
      size="lg"
      scrollBehavior="inside"
      initialFocusEl={() => contentRef.current}
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Modal.Backdrop />
        <Modal.Positioner
          pt={inset("top")}
          pb={inset("bottom")}
          pl={inset("left")}
          pr={inset("right")}
        >
          <Modal.Content ref={contentRef} maxH={drawer ? undefined : "100%"}>
            <Modal.Header>
              <Modal.Title>{title}</Modal.Title>
            </Modal.Header>
            <Modal.Body
              display="flex"
              flexDirection="column"
              gap="6"
              // The body scrolls; its sections keep their height.
              css={{ "& > *": { flexShrink: 0 } }}
            >
              {children}
            </Modal.Body>
            <Modal.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Modal.CloseTrigger>
          </Modal.Content>
        </Modal.Positioner>
      </Portal>
    </Modal.Root>
  );
}
