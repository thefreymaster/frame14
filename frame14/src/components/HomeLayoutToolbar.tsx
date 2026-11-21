import { ActionBar, Button, Portal, Text } from "@chakra-ui/react";
import { NAV_BAR_CLEARANCE } from "../lib/navMetrics";
import { WITH_RAIL } from "../lib/navPlace";

/**
 * The bar shown while arranging /home — Chakra's ActionBar, portalled to the
 * body (PageTransition leaves a transform on an ancestor, which would pin a
 * fixed bar to the page instead of the screen). It is lifted clear of the
 * bottom nav where the nav is the bar (lib/navPlace).
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
          bottom={`calc(${NAV_BAR_CLEARANCE} + 1rem)`}
          // Beside the rail, where the recipe puts it.
          css={{
            [WITH_RAIL]: {
              bottom:
                "calc(env(safe-area-inset-bottom) + var(--action-bar-offset))",
            },
          }}
        >
          <ActionBar.Content>
            <Text display={{ base: "none", md: "block" }} textStyle="sm">
              {resizable
                ? "Drag cards to move them · pick a width under each · the eye hides one"
                : "Drag cards to rearrange · the eye hides one"}
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
