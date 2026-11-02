import { useState } from "react";
import { Badge, Box, Flex, IconButton, Spacer } from "@chakra-ui/react";
import { IoVideocamOutline } from "react-icons/io5";
import { MdFullscreen } from "react-icons/md";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { useEntity } from "../hooks/useEntity";
import { Board } from "./Board";
import { CameraDialog } from "./CameraDialog";
import { CameraFeed, type CameraFeedState } from "./CameraFeed";
import { SectionTitle } from "./SectionTitle/SectionTitle";

interface NamedAttributes {
  friendly_name?: string | null;
}

/** The entity id as a name while the state hasn't arrived: "front_porch_high" → "Front Porch High". */
function nameFromId(entityId: string): string {
  return entityId
    .replace(/^camera\./, "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const STATE_BADGE: Record<
  CameraFeedState,
  { label: string; palette: string } | null
> = {
  connecting: null,
  live: { label: "Live", palette: "green" },
  stills: { label: "Stills", palette: "gray" },
  unavailable: { label: "Offline", palette: "red" },
};

const NO_LIGHTS: string[] = [];

/**
 * One camera on /cameras: a Board titled with the camera's name (its
 * friendly_name once its state arrives), a Badge for what the feed is
 * showing — Live, Stills (the fallback) or Offline — and the CameraFeed.
 *
 * The header's button puts the camera full screen (CameraDialog, 0.144)
 * with its room's lights in the dialog's header: the configured lights and
 * switches in the camera's Home Assistant area, as ha-areas.js resolves
 * them (`cameras` on the room in /api/entities). The picture lives in one
 * place at a time — the dialog's feed takes over while it is up, and the
 * card's starts again when it closes — so one stream runs, not two.
 */
export function CameraCard({ entityId }: { entityId: string }) {
  const { data: camera } = useEntity<NamedAttributes>(entityId);
  const { data: config } = useEntitiesConfig();
  const [state, setState] = useState<CameraFeedState>("connecting");
  const [open, setOpen] = useState(false);
  const name = camera?.attributes?.friendly_name || nameFromId(entityId);
  const badge = STATE_BADGE[state];
  const badgeNode = badge && (
    <Badge colorPalette={badge.palette}>{badge.label}</Badge>
  );
  const lights =
    config?.rooms?.find((room) => room.cameras?.includes(entityId))?.lights ??
    NO_LIGHTS;

  return (
    <>
      <Board
        title={
          <Flex align="center" gap="3" width="100%">
            <SectionTitle icon={<IoVideocamOutline />}>{name}</SectionTitle>
            <Spacer />
            {badgeNode}
          </Flex>
        }
        action={
          <IconButton
            aria-label="Full screen"
            variant="subtle"
            size="xs"
            rounded="l2"
            onClick={() => setOpen(true)}
          >
            <MdFullscreen />
          </IconButton>
        }
      >
        {open ? (
          <Box aspectRatio="16 / 9" rounded="sm" bg="black" />
        ) : (
          <CameraFeed entityId={entityId} onState={setState} />
        )}
      </Board>
      <CameraDialog
        open={open}
        onClose={() => setOpen(false)}
        title={name}
        badge={badgeNode}
        lights={lights}
      >
        <CameraFeed entityId={entityId} onState={setState} fill />
      </CameraDialog>
    </>
  );
}
