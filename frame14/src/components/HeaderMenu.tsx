import { useId, useState } from "react";
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
import { Tooltip } from "./ui/tooltip";

/** A turn of a glyph that turns (`turning`): unhurried, something at work. */
const TURN_SECONDS = 2;

/**
 * A header icon that opens a small menu of facts about what it shows (the
 * connection, a running appliance) on a tap: a stock Popover on the bar's
 * surface (the cards' colour, edge and corners, raised shades in dark mode),
 * headed by the icon and a title, then the rows the caller gives it (DataList
 * rows, a few of them: these menus are small and local). The icon is an
 * IconButton the mic's and the power button's size and shape (xs) but
 * `plain` — no fill, no highlight, the glyph at the header's icon size — so
 * every header button takes the same room and they sit evenly apart
 * (0.163.0, the user's ask); a focus ring when keyboard-focused. The menu
 * opens below it, its right edge on the icon's, so from the header's
 * right end it stays on screen. It mounts only while open, so a menu's own
 * polling (the connection's round trip) runs only then.
 *
 * Two things an icon may have besides (0.181.0, the install under way —
 * SoftwareInstallIndicator): a `tooltip`, what a pointer resting on it is
 * told (a touch only taps, and gets the menu), put away while the menu is
 * open so the two never lie over each other; and `turning`, the header's
 * glyph going round on Chakra's `spin` — a transform alone — and standing
 * still under reduced motion (`data-header-turning`). The menu's own copy
 * of the glyph stands still.
 */
export function HeaderMenu({
  icon,
  label,
  color,
  title = label,
  tooltip,
  turning = false,
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
  /** What a pointer resting on the icon is told. */
  tooltip?: string;
  /** The header's glyph goes round: something is under way. */
  turning?: boolean;
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}) {
  // The tooltip and the menu hang off one button, which each must know by
  // the same id (Chakra's way for a trigger of two things).
  const id = useId();
  const [open, setOpen] = useState(false);
  const [hinted, setHinted] = useState(false);
  const trigger = (
    <Popover.Trigger asChild>
      <IconButton
        aria-label={label}
        variant="plain"
        size="xs"
        flexShrink={0}
        color={color}
      >
        <Icon
          boxSize={HEADER_ICON_SIZE}
          animation={
            turning ? `spin ${TURN_SECONDS}s linear infinite` : undefined
          }
          _motionReduce={{ animation: "none" }}
          data-header-turning={turning ? "" : undefined}
        >
          {icon}
        </Icon>
      </IconButton>
    </Popover.Trigger>
  );
  return (
    <Popover.Root
      lazyMount
      unmountOnExit
      ids={tooltip ? { trigger: id } : undefined}
      positioning={{ placement: "bottom-end", gutter: 8 }}
      onOpenChange={(e) => {
        setOpen(e.open);
        onOpenChange?.(e.open);
      }}
    >
      {tooltip ? (
        <Tooltip
          ids={{ trigger: id }}
          content={tooltip}
          showArrow
          open={hinted && !open}
          onOpenChange={(e) => setHinted(e.open)}
        >
          {trigger}
        </Tooltip>
      ) : (
        trigger
      )}
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
