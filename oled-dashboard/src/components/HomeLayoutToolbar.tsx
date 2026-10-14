import { Button, Text } from "@chakra-ui/react";
import { ActionBarContent, ActionBarRoot } from "./ui/action-bar";

/**
 * The bar shown while arranging /home — Chakra's ActionBar, portalled to the
 * body (PageTransition leaves a transform on an ancestor, which would pin a
 * fixed bar to the page instead of the screen). Placement clears the portrait
 * nav bar; see src/theme/recipes/overlays.ts.
 *
 * Tapping and dragging cards is the whole point while it is open, so it never
 * closes on an outside press, and Escape is HomeBoard's (it must not end
 * arranging mid-drag).
 */
export function HomeLayoutToolbar({
  open,
  onDone,
  onReset,
}: {
  open: boolean;
  onDone: () => void;
  onReset: () => void;
}) {
  return (
    <ActionBarRoot
      open={open}
      closeOnInteractOutside={false}
      closeOnEscape={false}
    >
      <ActionBarContent>
        <Text
          display={{ base: "none", md: "block" }}
          whiteSpace="nowrap"
          fontSize="clamp(13px, 1.9vmin, 24px)"
          color="fg.dim"
          pr="clamp(4px, 1vmin, 14px)"
        >
          Drag cards to rearrange
        </Text>
        <Button
          size="toolbar"
          variant="ghost"
          color="fg.dim"
          _hover={{ bg: "surface.card" }}
          onClick={onReset}
        >
          Reset
        </Button>
        <Button
          size="toolbar"
          variant="solid"
          colorPalette="gray"
          onClick={onDone}
        >
          Done
        </Button>
      </ActionBarContent>
    </ActionBarRoot>
  );
}
