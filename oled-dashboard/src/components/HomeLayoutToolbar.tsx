import { ActionBar, Button, Portal, Text } from "@chakra-ui/react";
import { NAV_BAR_HEIGHT } from "../lib/navMetrics";

/**
 * The bar shown while arranging /home — Chakra's ActionBar, portalled to the
 * body (PageTransition leaves a transform on an ancestor, which would pin a
 * fixed bar to the page instead of the screen). In portrait it is lifted
 * clear of the bottom nav.
 *
 * Tapping and dragging cards is the whole point while it is open, so it never
 * closes on an outside press, and Escape is HomeBoard's (it must not end
 * arranging mid-drag).
 */
export function HomeLayoutToolbar({
  open,
  resizable,
  onDone,
  onReset,
}: {
  open: boolean;
  /** Cards also take a width here (not on a one-column phone). */
  resizable: boolean;
  onDone: () => void;
  onReset: () => void;
}) {
  return (
    <ActionBar.Root
      open={open}
      closeOnInteractOutside={false}
      closeOnEscape={false}
    >
      <Portal>
        <ActionBar.Positioner
          bottom={{
            _portrait: `calc(${NAV_BAR_HEIGHT} + env(safe-area-inset-bottom, 0px) + 1rem)`,
          }}
        >
          <ActionBar.Content>
            <Text display={{ base: "none", md: "block" }} textStyle="sm">
              {resizable
                ? "Drag cards to move them · pick a width under each"
                : "Drag cards to rearrange"}
            </Text>
            <ActionBar.Separator />
            <Button variant="outline" size="sm" onClick={onReset}>
              Reset
            </Button>
            <Button size="sm" onClick={onDone}>
              Done
            </Button>
          </ActionBar.Content>
        </ActionBar.Positioner>
      </Portal>
    </ActionBar.Root>
  );
}
