import { createPortal } from "react-dom";
import { Box, Button, Text } from "@chakra-ui/react";
import { GRID_GAP } from "../lib/surfaces";

const BUTTON = {
  height: "clamp(40px, 5.6vmin, 72px)",
  px: "clamp(16px, 2.6vmin, 36px)",
  fontSize: "clamp(14px, 2vmin, 26px)",
  borderRadius: "full",
  letterSpacing: "0.04em",
} as const;

/**
 * The bar shown while arranging /home. Portalled to the body: PageTransition
 * leaves a transform on an ancestor, which would pin a fixed bar to the page
 * instead of the screen.
 */
export function HomeLayoutToolbar({
  onDone,
  onReset,
}: {
  onDone: () => void;
  onReset: () => void;
}) {
  return createPortal(
    <Box
      position="fixed"
      zIndex={95}
      left="50%"
      transform="translateX(-50%)"
      display="flex"
      alignItems="center"
      gap="clamp(8px, 1.4vmin, 20px)"
      bg="var(--theme-surface-2)"
      pl="clamp(16px, 2.6vmin, 36px)"
      pr="clamp(6px, 1vmin, 14px)"
      py="clamp(6px, 1vmin, 14px)"
      borderRadius="full"
      boxShadow="0 1vmin 4vmin rgba(0, 0, 0, 0.7)"
      css={{
        "@media (orientation: landscape)": {
          bottom: `calc(env(safe-area-inset-bottom, 0px) + ${GRID_GAP})`,
        },
        "@media (orientation: portrait)": {
          bottom: `calc(64px + env(safe-area-inset-bottom, 0px) + ${GRID_GAP})`,
        },
      }}
    >
      <Text
        display={{ base: "none", md: "block" }}
        whiteSpace="nowrap"
        fontSize="clamp(13px, 1.9vmin, 24px)"
        color="var(--theme-fg-dim)"
        pr="clamp(4px, 1vmin, 14px)"
      >
        Drag cards to rearrange
      </Text>
      <Button
        {...BUTTON}
        variant="ghost"
        color="var(--theme-fg-dim)"
        _hover={{ bg: "var(--theme-surface-1)" }}
        onClick={onReset}
      >
        Reset
      </Button>
      <Button
        {...BUTTON}
        bg="var(--theme-fg)"
        color="var(--theme-bg)"
        _hover={{ opacity: 0.9 }}
        onClick={onDone}
      >
        Done
      </Button>
    </Box>,
    document.body,
  );
}
