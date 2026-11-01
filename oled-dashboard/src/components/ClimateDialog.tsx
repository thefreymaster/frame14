import { Dialog, IconButton, Portal, useMediaQuery } from "@chakra-ui/react";
import { IoClose } from "react-icons/io5";
import type { HomeClimate } from "../hooks/useHomeData";
import { HOME_ONE_COLUMN_QUERY } from "../lib/homeLayout";
import { ClimateControls } from "./ClimateControls";

/**
 * The thermostat modal the Home card's tiles open: a stock Chakra Dialog
 * holding ClimateControls (the dial, the mode selector and the fan speed),
 * the same controls /climate lays out in each thermostat's card.
 *
 * Full screen on a phone (0.133, the one-column screens), padded clear of the
 * status bar and the home indicator, the controls centred in the room under
 * the title; the md dialog on the frame and a desktop. Picked in JS rather
 * than as a responsive `size`: the md size doesn't undo the full one's height
 * and square corners. The close button is the header mic's shape
 * (VoiceAssistButton: subtle, xs, `l2`), in the title's row rather than the
 * recipe's corner.
 */
export function ClimateDialog({
  unit,
  open,
  onClose,
}: {
  unit: HomeClimate | null;
  open: boolean;
  onClose: () => void;
}) {
  const [phone] = useMediaQuery([HOME_ONE_COLUMN_QUERY], { ssr: false });
  const safeArea = (side: string) =>
    phone ? `env(safe-area-inset-${side}, 0px)` : undefined;

  return (
    <Dialog.Root
      open={open && unit != null}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement="center"
      size={phone ? "full" : "md"}
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            pt={safeArea("top")}
            pb={safeArea("bottom")}
            pl={safeArea("left")}
            pr={safeArea("right")}
          >
            <Dialog.Header alignItems="center" justifyContent="space-between">
              <Dialog.Title>{unit?.name ?? "Thermostat"}</Dialog.Title>
              <Dialog.CloseTrigger asChild position="static">
                <IconButton
                  aria-label="Close"
                  variant="subtle"
                  size="xs"
                  rounded="l2"
                >
                  <IoClose />
                </IconButton>
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body
              display="flex"
              flexDirection="column"
              justifyContent="center"
            >
              {unit && <ClimateControls key={unit.entity_id} unit={unit} />}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
