import { IconButton, Spinner } from "@chakra-ui/react";
import { MdLightbulb, MdOutlineLightbulb } from "react-icons/md";
import { useEntity } from "../hooks/useEntity";
import { useLightToggle } from "../hooks/useLightToggle";
import {
  lightColor,
  mdiIconName,
  rgba,
  type LightAttrs,
} from "../lib/lightModel";
import { lightEntry } from "../lib/lightsConfig";
import { MdiIcon } from "./MdiIcon";

/**
 * One light or switch as an icon button in the camera's full-screen header
 * (0.144): its own Home Assistant icon when it has one, else the bulb —
 * filled and in the light's colour while on, the outline in grey off. A tap
 * turns it off or on as a Lights tile's does (useLightToggle: a spinner in
 * the icon's place until Home Assistant reports it, a refusal toasted). Its
 * name is the button's label and `aria-pressed` its state. Nothing while the
 * entity is unavailable, as the tiles.
 */
export function CameraLightButton({ entityId }: { entityId: string }) {
  const { data } = useEntity<LightAttrs>(entityId);
  const state = data?.state;
  const attrs = data?.attributes;
  const isOn = state === "on";
  const label = attrs?.friendly_name || lightEntry(entityId).name;
  const { pending, toggle } = useLightToggle(entityId, label, state);
  if (!state || state === "unavailable" || state === "unknown") return null;

  const color = lightColor(isOn, attrs);
  const haIcon = mdiIconName(attrs?.icon);
  return (
    <IconButton
      aria-label={label}
      aria-pressed={isOn}
      aria-busy={pending != null}
      data-camera-light={entityId}
      variant="subtle"
      size="xs"
      rounded="l2"
      color={color ? rgba(color) : "fg.muted"}
      transition="color 300ms ease"
      onClick={() => void toggle()}
    >
      {pending ? (
        <Spinner size="xs" borderWidth="2px" />
      ) : haIcon ? (
        <MdiIcon name={haIcon} boxSize="4" />
      ) : isOn ? (
        <MdLightbulb />
      ) : (
        <MdOutlineLightbulb />
      )}
    </IconButton>
  );
}
