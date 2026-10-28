import { ActionBar, Button, Portal, Text } from "@chakra-ui/react";
import { FOOTER_CLEARANCE, NAV_BAR_CLEARANCE } from "../lib/navMetrics";
// The desktop lights strip is off for now (0.91, see Layout).
// import { LIGHT_STRIP_CLEARANCE } from "../lib/navMetrics"; // lights strip
import { useDesktop } from "../hooks/useDesktop";

/**
 * The bar shown while arranging /home — Chakra's ActionBar, portalled to the
 * body (PageTransition leaves a transform on an ancestor, which would pin a
 * fixed bar to the page instead of the screen). In portrait it is lifted
 * clear of the bottom nav, and on a desktop clear of the system footer.
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
  const desktop = useDesktop();

  return (
    <ActionBar.Root
      open={open}
      closeOnInteractOutside={false}
      closeOnEscape={false}
    >
      <Portal>
        <ActionBar.Positioner
          bottom={{
            _portrait: `calc(${NAV_BAR_CLEARANCE} + 1rem)`,
            // lights strip (above it on a desktop, while it was on):
            // _landscape: desktop ? `calc(${LIGHT_STRIP_CLEARANCE} + 1rem)` : undefined,
            _landscape: desktop ? `calc(${FOOTER_CLEARANCE} + 1rem)` : undefined,
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
