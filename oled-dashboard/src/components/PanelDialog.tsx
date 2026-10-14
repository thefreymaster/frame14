import { Dialog, Portal } from "@chakra-ui/react";
import { IoClose } from "react-icons/io5";
import { CloseButton } from "./ui/close-button";

/**
 * The detail modals' shell: a Chakra Dialog in the `panel` variant
 * (src/theme/recipes/dialog.ts). Escape, tap-outside and the enter/exit
 * animation are the library's; `glow` tints the scrim with the subject's
 * colour.
 *
 * The caller keeps whatever the panel shows after closing, so the exit
 * animation still has content to draw.
 */
export function PanelDialog({
  open,
  onClose,
  label,
  glow,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Accessible name — the panels have no visible title row. */
  label: string;
  glow?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      variant="panel"
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Dialog.Backdrop css={glow ? { "--dialog-glow": glow } : undefined} />
        <Dialog.Positioner>
          <Dialog.Content aria-label={label}>
            <Dialog.CloseTrigger asChild>
              <CloseButton
                variant="chrome"
                size="chrome"
                aria-label={`Close ${label}`}
              >
                <IoClose />
              </CloseButton>
            </Dialog.CloseTrigger>
            {children}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
