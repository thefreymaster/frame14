import { Dialog, Portal } from "@chakra-ui/react";
import { CloseButton } from "./ui/close-button";

/**
 * The detail modals' shell: a stock Chakra Dialog with a title, a body and a
 * close button. Escape, tap-outside and the enter/exit animation are the
 * library's.
 *
 * The caller keeps whatever the panel shows after closing, so the exit
 * animation still has content to draw.
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
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body display="flex" flexDirection="column" gap="6">
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
