import { useState } from "react";
import { IconButton, Portal } from "@chakra-ui/react";
import { IoClose } from "react-icons/io5";
import { useEntity } from "../hooks/useEntity";
import type { LightAttrs } from "../lib/lightModel";
import { LightControls } from "./LightControls";
import * as Modal from "./Modal";

/**
 * A dimmable light's controls in a Modal (a stock Chakra Dialog; a drawer from
 * the bottom on a phone and the frame, 0.134 / 0.135), opened by press and
 * hold on its tile. Since 0.141 it is FanDialog's shape — ClimateDialog's:
 * the md dialog, the mic's close button (subtle, xs, `l2`) in the title's row
 * — holding LightControls, the thermostat's dial for the brightness. Reads
 * the light live, so it follows changes made anywhere. The last light is kept
 * through the exit animation (0.135): the caller clears `entityId` to close,
 * and the controls going with it left a bare header to slide away.
 */
export function LightDialog({
  entityId,
  onClose,
}: {
  entityId: string | null;
  onClose: () => void;
}) {
  const [shownId, setShownId] = useState(entityId);
  if (entityId != null && entityId !== shownId) setShownId(entityId);
  const { data } = useEntity<LightAttrs>(shownId ?? "");
  const attrs = data?.attributes;

  return (
    <Modal.Root
      open={entityId != null}
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
              <Modal.Title>{attrs?.friendly_name ?? "Light"}</Modal.Title>
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
              {shownId && (
                <LightControls
                  key={shownId}
                  entityId={shownId}
                  attrs={attrs}
                  on={data?.state === "on"}
                />
              )}
            </Modal.Body>
          </Modal.Content>
        </Modal.Positioner>
      </Portal>
    </Modal.Root>
  );
}
