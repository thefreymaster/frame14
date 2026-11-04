import { Box, Icon, VStack } from "@chakra-ui/react";
import { useLightToggle } from "../hooks/useLightToggle";
import {
  lightColor,
  mdiIconName,
  rgba,
  type LightAttrs,
} from "../lib/lightModel";
import { displayLightName, lightEntry } from "../lib/lightsConfig";
import { MdiIcon } from "./MdiIcon";
import { Switch } from "./ui/switch";

/**
 * The controls of a light that only turns on and off, or a switch, in its
 * drawer (0.153.0: every tile's hold opens one now, for the favourite star in
 * its header — a dimmable light's has LightControls' dial). Its icon, drawn
 * as the tile draws it — Home Assistant's own, else the bulb or the outlet —
 * in its colour while on, over the power Switch: the tile's tap, the explicit
 * service through useLightToggle, which shows the state it waits for and
 * toasts a refusal.
 */
export function LightPowerControls({
  entityId,
  attrs,
  state,
}: {
  entityId: string;
  attrs: LightAttrs | undefined;
  state: string | undefined;
}) {
  const entry = lightEntry(entityId);
  const label = displayLightName(attrs?.friendly_name ?? entry.name);
  const { pending, toggle } = useLightToggle(entityId, label, state);
  const on = (pending ?? state) === "on";
  const color = lightColor(on, attrs);
  const haIcon = mdiIconName(attrs?.icon);
  const Glyph = on ? entry.ActiveIcon : entry.Icon;

  return (
    <VStack gap="6" align="center" py="4">
      <Box
        display="flex"
        color={color ? rgba(color, 1) : "fg.muted"}
        transition="color 300ms ease"
      >
        {haIcon ? (
          <MdiIcon name={haIcon} boxSize="20" />
        ) : (
          <Icon boxSize="20">
            <Glyph />
          </Icon>
        )}
      </Box>
      <Switch
        colorPalette="yellow"
        checked={on}
        onCheckedChange={() => void toggle()}
      >
        {on ? "On" : "Off"}
      </Switch>
    </VStack>
  );
}
