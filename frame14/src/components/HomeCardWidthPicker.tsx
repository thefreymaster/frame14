import { Box } from "@chakra-ui/react";
import { SegmentedControl } from "./ui/segmented-control";
import {
  HOME_CARDS,
  HOME_WIDTHS,
  type HomeCardId,
  type HomeGrid,
} from "../lib/homeLayout";

/**
 * A card's width while arranging /home: a segmented control of the fractions
 * the grid allows (¼ ½ ¾ Full on four columns, ½ Full on two), straddling the
 * card's bottom edge the way the drag grip straddles its corner.
 *
 * It sits inside the card's drag handle, so it keeps its presses to itself —
 * a tap here must pick a width, never start a drag or a keyboard move.
 */
export function HomeCardWidthPicker({
  id,
  grid,
  span,
  onChange,
}: {
  id: HomeCardId;
  grid: HomeGrid;
  span: number;
  onChange: (span: number) => void;
}) {
  const widths = HOME_WIDTHS[grid];

  return (
    <Box
      position="absolute"
      left="50%"
      bottom="0"
      transform="translate(-50%, 50%)"
      zIndex="1"
      shadow="md"
      rounded="full"
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <SegmentedControl
        size="xs"
        bg="bg"
        aria-label={`${HOME_CARDS[id].label} width`}
        items={widths.map((w) => ({ value: String(w.span), label: w.label }))}
        value={String(span)}
        onValueChange={(e) => {
          if (e.value) onChange(Number(e.value));
        }}
      />
    </Box>
  );
}
