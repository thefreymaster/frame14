import { HStack, Icon, Stack, Text } from "@chakra-ui/react";
import { IoArrowDown, IoArrowUp } from "react-icons/io5";
import { speedParts } from "../lib/speedTest";
import { SpeedSparkline } from "./SpeedSparkline";

const KINDS = {
  download: { label: "Download", icon: IoArrowDown },
  upload: { label: "Upload", icon: IoArrowUp },
} as const;

/** The strip under the figure: a little taller where the type is. */
const TRACE_HEIGHT = { base: "3.5rem", md: "6rem" };

/**
 * One of a speed test's two speeds (0.167.0): the figure large with its unit
 * — Mbps, Gbps from a thousand — and its name beside it, as the Unraid
 * page's meters are laid out, over the transfer's trace (SpeedSparkline).
 * While its transfer runs (`active`) the figure is the speed now, four times
 * a second, its arrow is the logo's blue and the trace grows; after, it is
 * the result. "—" for one not measured yet. The figure is plain text, not a
 * NumberFlow as the dials' are: one that changes every tick was never at
 * rest, its digits caught mid-roll whenever it was read.
 */
export function SpeedReadout({
  kind,
  value,
  trace,
  active = false,
}: {
  kind: keyof typeof KINDS;
  /** Mbps, or null before it has been measured. */
  value: number | null;
  trace: number[];
  active?: boolean;
}) {
  const { label, icon: KindIcon } = KINDS[kind];
  const parts = value == null ? null : speedParts(value);
  const figure = parts?.value.toFixed(parts.digits);

  return (
    <Stack
      gap="3"
      minW="0"
      data-speed-readout={kind}
      data-active={active || undefined}
      data-value={parts ? `${figure} ${parts.unit}` : ""}
    >
      <HStack justify="space-between" align="baseline" gap="4">
        <HStack align="baseline" gap="2" minW="0">
          <Text
            textStyle={{ base: "5xl", md: "6xl" }}
            fontWeight="semibold"
            lineHeight="1"
            // Every digit as wide as the next, so the figure doesn't shift
            // its unit about as it changes.
            fontVariantNumeric="tabular-nums"
            // The dash for nothing measured is quieter than a figure.
            color={figure ? undefined : "fg.subtle"}
          >
            {figure ?? "—"}
          </Text>
          <Text textStyle={{ base: "lg", md: "xl" }} color="fg.muted">
            {parts?.unit ?? "Mbps"}
          </Text>
        </HStack>
        <HStack gap="1.5" color="fg.muted" textStyle="lg" flexShrink="0">
          <Icon
            boxSize="5"
            color={active ? "brand.fg" : undefined}
            transition="color 300ms ease"
          >
            <KindIcon />
          </Icon>
          <Text>{label}</Text>
        </HStack>
      </HStack>
      <SpeedSparkline values={trace} live={active} height={TRACE_HEIGHT} />
    </Stack>
  );
}
