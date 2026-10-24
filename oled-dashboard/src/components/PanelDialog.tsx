import { Dialog, Portal } from "@chakra-ui/react";
import { PAGE_GUTTER } from "../lib/navMetrics";
import { CloseButton } from "./ui/close-button";

/**
 * The detail modals' shell: a stock Chakra Dialog with a title, a body and a
 * close button. Escape, tap-outside and the enter/exit animation are the
 * library's.
 *
 * The caller keeps whatever the panel shows after closing, so the exit
 * animation still has content to draw.
 *
 * A panel taller than the screen scrolls its body, not the whole dialog, so
 * the title and the close button stay put. It keeps clear of the screen's
 * safe areas, with the page gutter around it (in place of the recipe's
 * 3.75rem above and below, which a phone can't spare). On an iPhone, a
 * full-height panel otherwise put its close button under the status bar,
 * where it couldn't be tapped, and there was no outside left to tap instead.
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
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement="center"
      size="lg"
      scrollBehavior="inside"
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner
          pt={`calc(env(safe-area-inset-top, 0px) + ${PAGE_GUTTER})`}
          pb={`calc(env(safe-area-inset-bottom, 0px) + ${PAGE_GUTTER})`}
          pl={`calc(env(safe-area-inset-left, 0px) + ${PAGE_GUTTER})`}
          pr={`calc(env(safe-area-inset-right, 0px) + ${PAGE_GUTTER})`}
        >
          <Dialog.Content maxH="100%">
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body
              display="flex"
              flexDirection="column"
              gap="6"
              // The body scrolls; its sections keep their height.
              css={{ "& > *": { flexShrink: 0 } }}
            >
              {children}
            </Dialog.Body>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
