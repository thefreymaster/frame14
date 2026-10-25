import { useState } from "react";
import { Badge, Flex, Spacer } from "@chakra-ui/react";
import { useEntity } from "../hooks/useEntity";
import { Board } from "./Board";
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

/**
 * One camera on /cameras: a Board titled with the camera's name (its
 * friendly_name once its state arrives), a Badge for what the feed is
 * showing — Live, Stills (the fallback) or Offline — and the CameraFeed.
 */
export function CameraCard({ entityId }: { entityId: string }) {
  const { data: camera } = useEntity<NamedAttributes>(entityId);
  const [state, setState] = useState<CameraFeedState>("connecting");
  const name = camera?.attributes?.friendly_name || nameFromId(entityId);
  const badge = STATE_BADGE[state];

  return (
    <Board
      title={
        <Flex align="center" gap="3" width="100%">
          <SectionTitle>{name}</SectionTitle>
          <Spacer />
          {badge && <Badge colorPalette={badge.palette}>{badge.label}</Badge>}
        </Flex>
      }
    >
      <CameraFeed entityId={entityId} onState={setState} />
    </Board>
  );
}
