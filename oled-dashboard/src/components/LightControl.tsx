import { CheckboxCard, Icon } from "@chakra-ui/react";
import type { IconType } from "react-icons";
import { useEntity } from "../hooks/useEntity";
import { callService } from "../lib/callService";

type Props = {
  entity_id: string;
  name: string;
  Icon: IconType;
};

type LightAttrs = {
  friendly_name?: string;
};

/**
 * One light or switch as a Chakra CheckboxCard: the whole card is the toggle,
 * and the checked state is Chakra's own (yellow palette).
 */
export function LightControl({ entity_id, name, Icon: LightIcon }: Props) {
  const { data } = useEntity<LightAttrs>(entity_id);
  const state = data?.state;
  const isOn = state === "on";
  const unavailable = !state || state === "unavailable" || state === "unknown";
  const label = data?.attributes?.friendly_name ?? name;

  if (unavailable) return null;

  return (
    <CheckboxCard.Root
      data-light-entry=""
      checked={isOn}
      onCheckedChange={() => callService(entity_id, "toggle")}
      colorPalette="yellow"
      variant="surface"
      orientation="vertical"
      align="center"
      minW="0"
    >
      <CheckboxCard.HiddenInput />
      <CheckboxCard.Control>
        <Icon boxSize="8" color={isOn ? "colorPalette.fg" : "fg.muted"}>
          <LightIcon />
        </Icon>
        <CheckboxCard.Content minW="0" maxW="100%">
          <CheckboxCard.Label truncate maxW="100%">
            {label}
          </CheckboxCard.Label>
        </CheckboxCard.Content>
        <CheckboxCard.Indicator />
      </CheckboxCard.Control>
    </CheckboxCard.Root>
  );
}
