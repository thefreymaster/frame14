import {
  chakra,
  Menu,
  Portal,
  useTabsStyles,
  type SystemStyleObject,
} from "@chakra-ui/react";
import { IoEllipsisHorizontal } from "react-icons/io5";
import type { NavItem } from "../lib/navItems";
import { DARK_RAISED, ENTRY_RADIUS, NAV_PAD } from "../lib/floatingSurface";

/**
 * The portrait bar's More, for a nav longer than the bar holds: an entry like
 * the others (dots over "More"), selected while the view on screen is one of
 * its own, that opens the rest of the nav as a menu over the bar's trailing
 * end, as the iPhone's Home Assistant dashboard does. The menu is the bar's
 * surface (colour, edge, corners, padding), a gap above it and its right edge
 * on the bar's; its rows have the entries' concentric corners, and the view on
 * screen is bright against the others' muted grey, as the bar's selected
 * entry is (no fill).
 *
 * It sits in the bar's Tabs list but isn't a tab (a tab can't also be a menu's
 * trigger), so it takes the tabs' own styles from the list's context.
 */
export function NavMoreMenu({
  items,
  activeView,
  onSelect,
  bar,
  entryCss,
}: {
  items: NavItem[];
  activeView: string;
  onSelect: (path: string) => void;
  /** The bar, which the menu lines up with. */
  bar: React.RefObject<HTMLElement | null>;
  /** The bar entries' styles on top of the tabs', so More looks like one. */
  entryCss: SystemStyleObject;
}) {
  const tabs = useTabsStyles();
  const current = items.some((i) => i.path === activeView);

  return (
    <Menu.Root
      positioning={{
        placement: "top-end",
        gutter: 0,
        flip: false,
        // Its right edge is meant to be on the bar's, closer to the screen's
        // edge than the default keep-off would allow on a phone.
        overflowPadding: 0,
        // The bar's box, raised by its gap from the screen's side, which in
        // portrait is also its gap from the bottom: the menu sits one gap
        // above the bar, as the bar sits one gap above the screen's edge.
        getAnchorElement: () => {
          const el = bar.current;
          if (!el) return null;
          return {
            contextElement: el,
            getBoundingClientRect: () => {
              const r = el.getBoundingClientRect();
              return new DOMRect(
                r.left,
                r.top - r.left,
                r.width,
                r.height + r.left,
              );
            },
          };
        },
      }}
      onSelect={(e) => onSelect(e.value)}
    >
      <Menu.Trigger asChild>
        <chakra.button
          type="button"
          css={[tabs.trigger, entryCss]}
          data-selected={current ? "" : undefined}
        >
          <IoEllipsisHorizontal />
          More
        </chakra.button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content
            minW="12rem"
            p={NAV_PAD}
            bg="bg.surface"
            borderWidth="1px"
            borderColor="border.surface"
            rounded="surface"
            css={{ _dark: DARK_RAISED }}
          >
            {items.map((item) => {
              const active = item.path === activeView;
              const Icon = active ? item.activeIcon : item.icon;
              return (
                <Menu.Item
                  key={item.path}
                  value={item.path}
                  data-selected={active ? "" : undefined}
                  // A 2.75rem row: 44pt on a phone, Apple's smallest target.
                  minH="11"
                  px="3"
                  gap="3"
                  rounded={ENTRY_RADIUS}
                  textStyle="md"
                  fontWeight="medium"
                  color="fg.muted"
                  _icon={{ boxSize: "5" }}
                  _selected={{ color: "fg" }}
                >
                  <Icon />
                  {item.label}
                </Menu.Item>
              );
            })}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
