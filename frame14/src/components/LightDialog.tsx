import { useRef, useState } from "react";
import { HStack, IconButton, Portal } from "@chakra-ui/react";
import { IoClose, IoStar, IoStarOutline } from "react-icons/io5";
import { useEntity } from "../hooks/useEntity";
import { setLightFavorite, useLightFavorites } from "../lib/lightFavorites";
import { lightFeatures, type LightAttrs } from "../lib/lightModel";
import { LightControls } from "./LightControls";
import { LightPowerControls } from "./LightPowerControls";
import * as Modal from "./Modal";

/**
 * A light's controls in a Modal (a stock Chakra Dialog; a drawer from the
 * bottom on a phone and the frame, 0.134 / 0.135), opened by press and hold
 * on its tile. Since 0.141 it is FanDialog's shape — ClimateDialog's: the md
 * dialog, the mic's close button (subtle, xs, `l2`) in the title's row —
 * holding LightControls, the thermostat's dial for the brightness; a light
 * that only turns on and off, or a switch, holds LightPowerControls (0.153.0,
 * when every tile's hold began opening one). Beside the close button the
 * star (0.153.0): this device's favourite lights (lib/lightFavorites), which
 * /home's Lights card shows and /lights puts at its top. The close button
 * keeps the initial focus, as it had while it was alone in the row. Reads
 * the light live, so it follows changes made anywhere. The last light is
 * kept through the exit animation (0.135): the caller clears `entityId` to
 * close, and the controls going with it left a bare header to slide away.
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
  const favorite = useLightFavorites().includes(shownId ?? "");
  const closeRef = useRef<HTMLButtonElement>(null);

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
      initialFocusEl={() => closeRef.current}
    >
      <Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.Content>
            <Modal.Header alignItems="center" justifyContent="space-between">
              <Modal.Title>{attrs?.friendly_name ?? "Light"}</Modal.Title>
              <HStack gap="2">
                <IconButton
                  aria-label="Favorite"
                  aria-pressed={favorite}
                  variant="subtle"
                  size="xs"
                  rounded="l2"
                  color={favorite ? "yellow.500" : undefined}
                  onClick={() => {
                    if (shownId) setLightFavorite(shownId, !favorite);
                  }}
                >
                  {favorite ? <IoStar /> : <IoStarOutline />}
                </IconButton>
                <Modal.CloseTrigger asChild position="static">
                  <IconButton
                    ref={closeRef}
                    aria-label="Close"
                    variant="subtle"
                    size="xs"
                    rounded="l2"
                  >
                    <IoClose />
                  </IconButton>
                </Modal.CloseTrigger>
              </HStack>
            </Modal.Header>
            <Modal.Body>
              {shownId &&
                (lightFeatures(attrs).brightness ? (
                  <LightControls
                    key={shownId}
                    entityId={shownId}
                    attrs={attrs}
                    on={data?.state === "on"}
                  />
                ) : (
                  <LightPowerControls
                    key={shownId}
                    entityId={shownId}
                    attrs={attrs}
                    state={data?.state}
                  />
                ))}
            </Modal.Body>
          </Modal.Content>
        </Modal.Positioner>
      </Portal>
    </Modal.Root>
  );
}
