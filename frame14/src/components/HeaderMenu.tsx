import {
  HStack,
  Icon,
  IconButton,
  Popover,
  Portal,
  Text,
} from "@chakra-ui/react";
import { DARK_RAISED } from "../lib/floatingSurface";
import { HEADER_ICON_SIZE, PAGE_GUTTER } from "../lib/navMetrics";

/**
 * A header icon that opens a small menu of facts about what it shows (the
 * connection, a running appliance) on a tap: a stock Popover on the bar's
 * surface (the cards' colour, edge and corners, raised shades in dark mode),
 * headed by the icon and a title, then the rows the caller gives it (DataList
 * rows, a few of them: these menus are small and local). The icon is an
 * IconButton the mic's and the power button's size and shape (xs, `l2`) but
 * `plain` — no fill, no highlight, the glyph at the header's icon size — so
 * every header button takes the same room and they sit evenly apart
 * (0.163.0, the user's ask); a focus ring when keyboard-focused. The menu
 * opens below it, its right edge on the icon's, so from the header's
 * right end it stays on screen. It mounts only while open, so a menu's own
 * polling (the connection's round trip) runs only then.
 */
export function HeaderMenu({
  icon,
  label,
  color,
  title = label,
  children,
  onOpenChange,
}: {
  /** The glyph, as the header shows it. */
  icon: React.ReactNode;
  /** What the icon means, for screen readers (and the title by default). */
  label: string;
  /** The icon's colour: the status colour it has in the header. */
  color?: string;
  title?: React.ReactNode;
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <Popover.Root
      lazyMount
      unmountOnExit
      positioning={{ placement: "bottom-end", gutter: 8 }}
      onOpenChange={(e) => onOpenChange?.(e.open)}
    >
      <Popover.Trigger asChild>
        <IconButton
          aria-label={label}
          variant="plain"
          size="xs"
          rounded="l2"
          flexShrink={0}
          color={color}
        >
          <Icon boxSize={HEADER_ICON_SIZE}>{icon}</Icon>
        </IconButton>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content
            width="auto"
            minW="16rem"
            maxW={`calc(100vw - 2 * ${PAGE_GUTTER})`}
            bg="bg.surface"
            borderWidth="1px"
            borderColor="border.surface"
            rounded="surface"
            shadow="lg"
            css={{ _dark: DARK_RAISED }}
          >
            <Popover.Body p="3">
              <HStack gap="2" mb="2" color={color}>
                <Icon boxSize={HEADER_ICON_SIZE}>{icon}</Icon>
                <Text fontWeight="semibold" color="fg">
                  {title}
                </Text>
              </HStack>
              {children}
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}
