import { Dialog, Portal } from "@chakra-ui/react";
import type { HomeClimate } from "../hooks/useHomeData";
import { ClimateControls } from "./ClimateControls";
import { CloseButton } from "./ui/close-button";

/**
 * The thermostat modal the Home card's tiles open: a stock Chakra Dialog
 * holding ClimateControls (the dial, the mode selector and the fan speed),
 * the same controls /climate lays out in each thermostat's card.
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
    <Dialog.Root
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
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{unit?.name ?? "Thermostat"}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              {unit && <ClimateControls key={unit.entity_id} unit={unit} />}
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
