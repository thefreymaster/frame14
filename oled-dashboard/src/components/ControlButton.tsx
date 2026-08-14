import { Box } from "@chakra-ui/react";
import { CHIP_PADDING_X, CHIP_PADDING_Y, CHIP_RADIUS } from "../lib/surfaces";

/**
 * A pressable chip — the interactive twin of StatusChip.
 *
 * Elevation is fill, never outline: a selected control steps up to
 * --theme-surface-2-on rather than growing a border. That keeps the pages that
 * are mostly controls (control, solar, timer) matching the raised tiles on
 * /home, and it survives the bright/dark swap, which a hardcoded rgba border
 * did not.
 */
export function ControlButton({
  children,
  onClick,
  active = false,
  grow = false,
  square = false,
  radius = CHIP_RADIUS,
  px = CHIP_PADDING_X,
  py = CHIP_PADDING_Y,
  label,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  /** Take an equal share of the row (segmented groups, full-width actions). */
  grow?: boolean;
  /** Square tile instead of a pill — the view grid on /control. */
  square?: boolean;
  radius?: string;
  px?: string;
  py?: string;
  label?: string;
}) {
  return (
    <Box
      as="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      flex={grow ? "1" : undefined}
      minW="0"
      position="relative"
      aspectRatio={square ? "1" : undefined}
      bg={active ? "var(--theme-surface-2-on)" : "var(--theme-surface-2)"}
      color={active ? "var(--theme-fg)" : "var(--theme-fg-dim)"}
      borderRadius={radius}
      px={px}
      py={py}
      display="flex"
      flexDirection={square ? "column" : "row"}
      alignItems="center"
      justifyContent="center"
      gap="1vmin"
      cursor="pointer"
      _active={{ transform: "scale(0.97)", opacity: 0.85 }}
      transition="background-color 160ms ease, color 160ms ease, transform 80ms cubic-bezier(0.2, 0, 0.2, 1)"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {children}
    </Box>
  );
}
