import { Portal } from "@chakra-ui/react";
import { BoardFrame } from "../lib/boardFrame";
import { HOME_CARDS, type HomeCardId } from "../lib/homeLayout";
import * as Modal from "./Modal";

/**
 * A /home card opened out (0.171.0): the board fits the screen and doesn't
 * scroll, so a card that had to be cut short — a list down to the rows there
 * was room for, or to its header — has a way to all of it (the user: "All
 * content should still be viewable … if it says and four more items there
 * should be a way to see those items"). The card's own contents again, whole,
 * as a modal's header and body (lib/boardFrame): a sheet on the frame, a
 * dialog on a desktop, scrolling inside itself if it is taller than the
 * screen. `id` stays while it closes, so the card is there through the exit.
 */
export function HomeCardDialog({
  id,
  open,
  onClose,
  children,
}: {
  id: HomeCardId | null;
  open: boolean;
  onClose: () => void;
  /** The card (HomeOverview's node for `id`). */
  children: React.ReactNode;
}) {
  return (
    <Modal.Root
      open={open && id != null}
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
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.Content
            data-home-card-dialog={id ?? undefined}
            aria-label={id ? HOME_CARDS[id].label : undefined}
          >
            <BoardFrame.Provider value="modal">{children}</BoardFrame.Provider>
          </Modal.Content>
        </Modal.Positioner>
      </Portal>
    </Modal.Root>
  );
}
