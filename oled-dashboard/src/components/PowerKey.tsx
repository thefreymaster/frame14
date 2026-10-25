import { Box, HStack, Text } from "@chakra-ui/react";
import { ENERGY_COLORS } from "../lib/energy";

/**
 * A legend entry for one of the power lines: a short stroke in the line's
 * colour, then its name, with a value before the name when there is one
 * ("7.5 kW Solar"; "—" for a null reading). The value is text in `fg`, the
 * name in `fg.muted`: the colour sits beside the words, never on them.
 */
export function PowerKey({
  color,
  label,
  value,
}: {
  color: "solar" | "home";
  label: string;
  /** Preformatted; null shows a dash, undefined shows the name alone. */
  value?: string | null;
}) {
  return (
    <HStack gap="2" whiteSpace="nowrap">
      <Box w="3.5" h="0.5" rounded="full" bg={ENERGY_COLORS[color]} />
      {value !== undefined ? (
        <>
          <Text fontWeight="semibold">{value ?? "—"}</Text>
          <Text color="fg.muted">{label}</Text>
        </>
      ) : (
        <Text color="fg.muted">{label}</Text>
      )}
    </HStack>
  );
}
