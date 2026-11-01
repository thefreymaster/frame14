import { IconButton, Portal } from "@chakra-ui/react";
import { IoClose } from "react-icons/io5";
import type { HomeClimate } from "../hooks/useHomeData";
import { useBottomDrawer } from "../hooks/useBottomDrawer";
import { ClimateControls } from "./ClimateControls";
import * as Modal from "./Modal";

/**
 * The thermostat modal the Home card's tiles open: holding ClimateControls
 * (the dial, the mode selector and the fan speed), the same controls /climate
 * lays out in each thermostat's card.
 *
 * On a phone a full-screen drawer that comes in from the bottom (0.133 full
 * screen, 0.134 a drawer; Modal), padded clear of the status bar and the home
 * indicator, the controls centred in the room under the title; the md dialog
 * on the frame and a desktop. The close button is the header mic's shape
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
  const phone = useBottomDrawer();
  const safeArea = (side: string) =>
    phone ? `env(safe-area-inset-${side}, 0px)` : undefined;

  return (
    <Modal.Root
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
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.Content
            pt={safeArea("top")}
            pb={safeArea("bottom")}
            pl={safeArea("left")}
            pr={safeArea("right")}
          >
            <Modal.Header alignItems="center" justifyContent="space-between">
              <Modal.Title>{unit?.name ?? "Thermostat"}</Modal.Title>
              <Modal.CloseTrigger asChild position="static">
                <IconButton
                  aria-label="Close"
                  variant="subtle"
                  size="xs"
                  rounded="l2"
                >
                  <IoClose />
                </IconButton>
              </Modal.CloseTrigger>
            </Modal.Header>
            <Modal.Body
              display="flex"
              flexDirection="column"
              justifyContent="center"
            >
              {unit && <ClimateControls key={unit.entity_id} unit={unit} />}
            </Modal.Body>
          </Modal.Content>
        </Modal.Positioner>
      </Portal>
    </Modal.Root>
  );
}
