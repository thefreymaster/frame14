import { Box, HStack } from "@chakra-ui/react";
import {
  CHIP_PADDING_X,
  CHIP_PADDING_Y,
  CHIP_RADIUS,
} from "../lib/surfaces";

/**
 * A single raised chip — the second elevation step, nested inside a Board.
 *
 * Chips carry their own edges, so a label and its value stay next to each
 * other instead of being flung to opposite sides of a 1600px panel.
 */
export function StatusChip({
  icon,
  children,
  active = false,
  grow = false,
  onClick,
  label,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  grow?: boolean;
  onClick?: () => void;
  label?: string;
}) {
  return (
    <HStack
      as={onClick ? "button" : "div"}
      aria-label={label}
      onClick={onClick}
      gap="1vmin"
      align="center"
      minW="0"
      flex={grow ? "1" : "0 1 auto"}
      bg={active ? "var(--theme-surface-2-on)" : "var(--theme-surface-2)"}
      borderRadius={CHIP_RADIUS}
      px={CHIP_PADDING_X}
      py={CHIP_PADDING_Y}
      cursor={onClick ? "pointer" : undefined}
      textAlign="left"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {icon && (
        <Box
          color={active ? "var(--theme-fg-dim)" : "var(--theme-fg-faint)"}
          fontSize="2.2vmin"
          lineHeight="1"
          display="inline-flex"
          flexShrink={0}
        >
          {icon}
        </Box>
      )}
      {children}
    </HStack>
  );
}
