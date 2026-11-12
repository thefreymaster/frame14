import { useEffect, useState } from "react";
import { Box, Card, HStack, Icon, Spinner, Text } from "@chakra-ui/react";
import { MdCheck, MdOutlinePlayCircle } from "react-icons/md";
import { toaster } from "./ui/toaster";
import { useEntity } from "../hooks/useEntity";
import { runScene } from "../lib/callService";
import { mdiIconName } from "../lib/lightModel";
import { sceneAvailable, sceneName, type SceneAttrs } from "../lib/scenes";
import { MdiIcon } from "./MdiIcon";

// How long the tick stands in for the icon after a run.
export const DONE_MS = 2000;

type Phase = "idle" | "running" | "done";

/**
 * One of the Lights page's scenes as a tile (0.165.0): a scene, a script or
 * an automation from `scene_entities`, shaped as a light's tile — the icon
 * set for it in Home Assistant beside its name (without one a play button,
 * since a tap runs it; 0.165.0's sparkles read as an AI badge and went in
 * 0.165.1) — with nothing under the name, since there is no state to show. From the tap until the server's ack (Home Assistant's answer) a
 * spinner stands in for the icon and further taps are ignored; then a tick
 * for DONE_MS, the only sign it ran when no light on the page changes, or an
 * error toast with Home Assistant's words when it didn't.
 *
 * One Home Assistant doesn't have, or reports unavailable, renders nothing.
 * A scene never yet turned on is "unknown" there and is shown.
 */
export function SceneTile({ entityId }: { entityId: string }) {
  const { data } = useEntity<SceneAttrs>(entityId);
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    if (phase !== "done") return;
    const timer = setTimeout(() => setPhase("idle"), DONE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  if (!sceneAvailable(data?.state)) return null;

  const label = sceneName(entityId, data?.attributes);
  const haIcon = mdiIconName(data?.attributes?.icon);

  async function run() {
    if (phase === "running") return;
    setPhase("running");
    const result = await runScene(entityId);
    if (result.ok) {
      setPhase("done");
      return;
    }
    setPhase("idle");
    toaster.create({
      type: "error",
      title: `Couldn't run ${label}`,
      description: result.error,
    });
  }

  return (
    <Card.Root
      asChild
      data-scene-entry=""
      data-scene-phase={phase}
      size="sm"
      variant="outline"
      borderRadius="sm"
      minW="0"
      cursor="pointer"
      focusVisibleRing="outside"
      _active={{ transform: "scale(0.98)" }}
      css={{ touchAction: "manipulation" }}
    >
      <button
        type="button"
        aria-busy={phase === "running"}
        aria-label={`Run ${label}`}
        onClick={() => void run()}
      >
        <HStack align="center" gap="3" p="3">
          <Box
            flexShrink={0}
            display="flex"
            boxSize="7"
            alignItems="center"
            justifyContent="center"
            color={phase === "done" ? "fg.success" : "fg.muted"}
            transition="color 300ms ease"
          >
            {phase === "running" ? (
              <Spinner size="sm" borderWidth="2px" />
            ) : phase === "done" ? (
              <Icon boxSize="7">
                <MdCheck />
              </Icon>
            ) : haIcon ? (
              <MdiIcon name={haIcon} boxSize="7" />
            ) : (
              <Icon boxSize="7">
                <MdOutlinePlayCircle />
              </Icon>
            )}
          </Box>
          {/* As a light tile's name: stretched, three lines before it cuts. */}
          <Text
            flex="1"
            minW="0"
            textStyle="sm"
            fontWeight="medium"
            lineHeight="short"
            lineClamp="3"
            overflowWrap="anywhere"
            textAlign="start"
          >
            {label}
          </Text>
        </HStack>
      </button>
    </Card.Root>
  );
}
