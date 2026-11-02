import { HStack, IconButton, Portal } from "@chakra-ui/react";
import { IoClose } from "react-icons/io5";
import { useEntities } from "../hooks/useEntity";
import type { LightAttrs } from "../lib/lightModel";
import { lightEntry, sortLightEntries } from "../lib/lightsConfig";
import { CameraLightButton } from "./CameraLightButton";
import * as Modal from "./Modal";

/**
 * A camera full screen (0.144, the user's ask: "full screen cameras and
 * control lights from that full screen dialog with icon buttons in the
 * dialog header"): a `Modal` with `full` — a full-screen Dialog on every
 * device, the one modal that isn't a sheet — whose header holds the camera's
 * name, its feed's badge, the `lights` as CameraLightButtons (alphabetical
 * by name, as the Lights page has its tiles) and the mic-shaped close button
 * the other dialogs have; the body is black, edge to edge, and `children`
 * is the picture filling it (a CameraFeed with `fill`). Escape and the
 * button close it.
 */
export function CameraDialog({
  open,
  onClose,
  title,
  badge,
  lights,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** The feed's Live / Stills / Offline badge, beside the title. */
  badge?: React.ReactNode;
  /** The lights and switches to control from the header. */
  lights: readonly string[];
  children: React.ReactNode;
}) {
  // The names, for the order; each button reads its own light.
  const states = useEntities<LightAttrs>(lights);
  const nameById = new Map(
    states.map((q) => [q.data?.entity_id, q.data?.attributes?.friendly_name]),
  );
  const entries = sortLightEntries(
    lights.map(lightEntry),
    (entry) => nameById.get(entry.entity_id) || entry.name,
  );

  return (
    <Modal.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      full
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.Content
            data-camera-dialog=""
            h="100dvh"
            // Clear of an iPhone's status bar and home indicator.
            pt="env(safe-area-inset-top, 0px)"
            pb="env(safe-area-inset-bottom, 0px)"
          >
            <Modal.Header alignItems="center" gap="3" pt="4" pb="3">
              <Modal.Title flex="1" minW="0" truncate>
                {title}
              </Modal.Title>
              {badge}
              {entries.length > 0 && (
                <HStack
                  role="group"
                  aria-label="Lights"
                  gap="1"
                  flexShrink={0}
                  flexWrap="wrap"
                  justify="flex-end"
                >
                  {entries.map((entry) => (
                    <CameraLightButton
                      key={entry.entity_id}
                      entityId={entry.entity_id}
                    />
                  ))}
                </HStack>
              )}
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
            <Modal.Body p="0" flex="1" minH="0" position="relative" bg="black">
              {children}
            </Modal.Body>
          </Modal.Content>
        </Modal.Positioner>
      </Portal>
    </Modal.Root>
  );
}
