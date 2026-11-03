import { IconButton, Portal } from "@chakra-ui/react";
import { IoClose } from "react-icons/io5";
import type { HomeFan } from "../hooks/useHomeData";
import { FanControls } from "./FanControls";
import * as Modal from "./Modal";

/**
 * The fan modal the Fans card's tiles open: ClimateDialog's shape holding
 * FanControls (the dial for the speed and the power switch) — a sheet from
 * the bottom on a phone and the frame, as tall as the controls, the md
 * dialog on a desktop. The close button is the header mic's shape
 * (VoiceAssistButton: subtle, xs, `l2`), in the title's row.
 */
export function FanDialog({
  fan,
  open,
  onClose,
}: {
  fan: HomeFan | null;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal.Root
      open={open && fan != null}
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
              <Modal.Title>{fan?.name ?? "Fan"}</Modal.Title>
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
              {fan && <FanControls key={fan.entity_id} fan={fan} />}
            </Modal.Body>
          </Modal.Content>
        </Modal.Positioner>
      </Portal>
    </Modal.Root>
  );
}
