import { Text, VStack, chakra } from "@chakra-ui/react";
import { rgba, type RGB } from "../lib/lightModel";

/**
 * One of the light dialog's presets as a round swatch of its colour, ringed
 * while it's the light's (its own file since 0.141; LightDialog's before).
 */
export function LightSwatch({
  rgb,
  label,
  selected,
  onPick,
}: {
  rgb: RGB;
  label: string;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <VStack gap="1" width="3.5rem">
      <chakra.button
        type="button"
        aria-label={label}
        aria-pressed={selected}
        onClick={onPick}
        width="2.75rem"
        height="2.75rem"
        rounded="full"
        cursor="pointer"
        style={{ background: rgba(rgb) }}
        borderWidth="1px"
        borderColor="border"
        outline={selected ? "2px solid" : undefined}
        outlineColor="fg"
        outlineOffset="2px"
        focusVisibleRing="outside"
      />
      <Text textStyle="xs" color={selected ? "fg" : "fg.muted"}>
        {label}
      </Text>
    </VStack>
  );
}
