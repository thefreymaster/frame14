import { IconButton, Portal } from "@chakra-ui/react";
import { IoClose } from "react-icons/io5";
import type { HomeClimate } from "../hooks/useHomeData";
import { ClimateControls } from "./ClimateControls";
import * as Modal from "./Modal";

/**
 * The thermostat modal the Home card's tiles open: a Modal holding
 * ClimateControls (the dial, the mode selector and the fan speed), the same
 * controls /climate lays out in each thermostat's card — a sheet from the
 * bottom on a phone and the frame, as tall as the controls (0.135: the user
 * asked for none full height, after 0.133's full screen), the md dialog on a
 * desktop. The close button is the header mic's shape (VoiceAssistButton:
 * subtle, xs, `l2`), in the title's row rather than the recipe's corner.
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
  return (
    <Modal.Root
      open={open && unit != null}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement="center"
      size="md"
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.Content>
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
            <Modal.Body>
              {unit && <ClimateControls key={unit.entity_id} unit={unit} />}
            </Modal.Body>
          </Modal.Content>
        </Modal.Positioner>
      </Portal>
    </Modal.Root>
  );
}
