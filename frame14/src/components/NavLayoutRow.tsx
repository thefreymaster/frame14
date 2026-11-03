import { Badge, Box, HStack, Icon, Stack, Text } from "@chakra-ui/react";
import { IoEllipsisHorizontal } from "react-icons/io5";
import { LuLock } from "react-icons/lu";
import type { NavItem } from "../lib/navItems";
import { Switch } from "./ui/switch";

export interface NavLayoutRowProps {
  item: NavItem;
  shown: boolean;
  /** Always in the nav: the switch is on and can't be turned off. */
  locked?: boolean;
  /** A line under the name, e.g. why it's locked. */
  note?: string;
  /** The bottom bar puts it under More (NavMoreMenu) right now. */
  inMore?: boolean;
  onShownChange?: (shown: boolean) => void;
  /** The drag handle; a padlock stands in on a row that can't move. */
  handle?: React.ReactNode;
  /** Lifted while it's being dragged. */
  dragging?: boolean;
  ref?: React.Ref<HTMLDivElement>;
  style?: React.CSSProperties;
}

/**
 * One nav entry on /control's Navigation card: a well with the drag handle,
 * the entry's icon and name, and a switch for whether this device's nav shows
 * it. A hidden entry's icon and name are greyed.
 */
export function NavLayoutRow({
  item,
  shown,
  locked = false,
  note,
  inMore = false,
  onShownChange,
  handle,
  dragging = false,
  ref,
  style,
}: NavLayoutRowProps) {
  return (
    <HStack
      ref={ref}
      style={style}
      gap="3"
      ps="1"
      pe="3"
      py="1.5"
      rounded="sm"
      bg="bg.muted"
      position="relative"
      zIndex={dragging ? 1 : undefined}
      shadow={dragging ? "lg" : undefined}
    >
      {handle ?? (
        <Box
          boxSize="8"
          display="grid"
          placeItems="center"
          color="fg.subtle"
          aria-hidden
        >
          <LuLock />
        </Box>
      )}
      <Icon boxSize="5" color={shown ? "fg.muted" : "fg.subtle"}>
        <item.icon />
      </Icon>
      <Stack gap="0" flex="1" minW="0">
        <Text fontWeight="medium" color={shown ? "fg" : "fg.subtle"} truncate>
          {item.label}
        </Text>
        {note && (
          <Text textStyle="xs" color="fg.muted" truncate>
            {note}
          </Text>
        )}
      </Stack>
      {shown && inMore && (
        <Badge variant="outline" size="sm">
          <IoEllipsisHorizontal />
          More
        </Badge>
      )}
      <Switch
        checked={shown}
        disabled={locked}
        onCheckedChange={(e) => onShownChange?.(e.checked)}
        inputProps={{ "aria-label": `Show ${item.label} in the nav` }}
      />
    </HStack>
  );
}
