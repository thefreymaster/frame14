import { useState, useEffect, useRef } from "react";
import { Box, Spacer, Tabs, type SystemStyleObject } from "@chakra-ui/react";
import { useLocation, useNavigate } from "react-router";
import { socket } from "../lib/socket";
import { getDeviceMode } from "../lib/deviceMode";
import { useLiveGame } from "../hooks/useLiveGame";
import {
  ENTRY_RADIUS,
  FLOATING_SURFACE,
  NAV_PAD,
} from "../lib/floatingSurface";
import {
  HEADER_CLEARANCE,
  NAV_BAR_BOTTOM,
  NAV_BAR_BOTTOM_RADIUS,
  NAV_BAR_CLEARANCE,
  NAV_BAR_END_ENTRY_RADIUS,
  NAV_BAR_HEIGHT,
  NAV_BAR_INSET,
  NAV_BAR_LIFT,
  NAV_BAR_SIDE_ROOM,
  NAV_BAR_TOP_RADIUS,
  NAV_RAIL_BOTTOM,
  NAV_RAIL_WIDTH,
  PAGE_GUTTER,
} from "../lib/navMetrics";
import { SETTINGS_PATH, splitForBar, type NavItem } from "../lib/navItems";
import { useNavItems } from "../lib/navLayout";
import { NavMoreMenu } from "./NavMoreMenu";

const LOCAL_ONLY_PATHS = new Set([
  "/control",
  "/lights",
  "/radar",
  "/timer",
  "/album",
]);

// Each nav entry's look. In the portrait bar entries fill its height, and on
// a phone the labels drop to xs, Apple Music's small captions; the end
// entries' outer bottom corners follow an iPhone's curve (see navMetrics).
// 20px icons on a phone and a little larger wherever the type scale grows.
// The selected entry has no fill (the subtle tab's is cleared): its icon and
// label are the full foreground against the others' muted grey, and that alone
// says which view is on screen.
function entryCss(placement: "bar" | "rail"): SystemStyleObject {
  const inBar = placement === "bar";
  return {
    flexDirection: "column",
    justifyContent: "center",
    height: inBar ? "100%" : "auto",
    rounded: ENTRY_RADIUS,
    _first: inBar ? { roundedBottomLeft: NAV_BAR_END_ENTRY_RADIUS } : {},
    _last: inBar ? { roundedBottomRight: NAV_BAR_END_ENTRY_RADIUS } : {},
    px: "1",
    py: inBar ? "0" : "2",
    gap: "1",
    textStyle: inBar ? { base: "xs", md: "sm" } : undefined,
    _icon: { boxSize: { base: "5", md: "1.375rem" } },
    _selected: { bg: "transparent", color: "fg" },
  };
}

interface LandscapeNavProps {
  hidden?: boolean;
}

export function LandscapeNav({ hidden = false }: LandscapeNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState(location.pathname);
  // Follow route changes (derived during render rather than in an effect).
  const [routePath, setRoutePath] = useState(location.pathname);
  if (routePath !== location.pathname) {
    setRoutePath(location.pathname);
    setActiveView(location.pathname);
  }
  const isFrame = getDeviceMode() === "frame";
  const { games } = useLiveGame();
  // This device's entries in its order, as /control sets them (lib/navLayout).
  const items = useNavItems(games.length > 0);
  const { bar, more } = splitForBar(items);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onChangeView(view: string) {
      setActiveView(`/${view}`);
    }
    socket.on("change_view", onChangeView);
    return () => {
      socket.off("change_view", onChangeView);
    };
  }, []);

  function handleClick(path: string) {
    navigate(path);
    if (isFrame && !LOCAL_ONLY_PATHS.has(path)) {
      socket.emit("change", path.replace("/", ""));
    }
    setActiveView(path);
  }

  // Each nav entry is a Tabs trigger: the selected tab is the view on screen.
  // Navigation happens on click rather than onValueChange, so tapping the tab
  // you are already on still re-sends it to the other frames, as before.
  // Both navs float; the selected entry is bright, not filled, and the
  // entries' corners (ENTRY_RADIUS, for the focus ring) are concentric with
  // the nav's.
  function renderItem(item: NavItem, placement: "bar" | "rail") {
    const isActive = activeView === item.path;
    const Icon = isActive ? item.activeIcon : item.icon;
    return (
      <Tabs.Trigger
        key={item.path}
        value={item.path}
        onClick={() => handleClick(item.path)}
        css={entryCss(placement)}
      >
        <Icon />
        {item.label}
      </Tabs.Trigger>
    );
  }

  // The rail has room for every entry. Settings, when it ends the nav, sits
  // at the rail's foot.
  const settingsLast = items.at(-1)?.path === SETTINGS_PATH;
  const railTop = settingsLast ? items.slice(0, -1) : items;
  const railFoot = settingsLast ? items.slice(-1) : [];

  return (
    <>
      {/* Portrait: a floating bar, like Apple Music's tab bar but opaque (no
          glass). It is inset from the sides and sits just above the home
          indicator, and the page scrolls on underneath and around it. On an
          iPhone its bottom corners follow the screen's and its top is flat;
          elsewhere it has the cards' corners (NAV_BAR_TOP_RADIUS). It holds
          five entries; a longer nav keeps its first five and puts the rest
          under More (NavMoreMenu), as an iPhone tab bar does. */}
      <Box
        ref={barRef}
        {...FLOATING_SURFACE}
        rounded={`${NAV_BAR_TOP_RADIUS} ${NAV_BAR_TOP_RADIUS} ${NAV_BAR_BOTTOM_RADIUS} ${NAV_BAR_BOTTOM_RADIUS}`}
        display={{ base: "block", _landscape: "none" }}
        top={`calc(var(--app-height, 100dvh) - ${NAV_BAR_CLEARANCE})`}
        left={`calc(env(safe-area-inset-left, 0px) + ${NAV_BAR_INSET})`}
        right={`calc(env(safe-area-inset-right, 0px) + ${NAV_BAR_INSET})`}
        height={`calc(${NAV_BAR_HEIGHT} + ${NAV_BAR_LIFT})`}
        px={`calc(${NAV_PAD} + ${NAV_BAR_SIDE_ROOM})`}
        pb={`calc(${NAV_PAD} + ${NAV_BAR_LIFT})`}
        // Down past the screen edge, shadow and all.
        transform={
          hidden
            ? `translateY(calc(100% + ${NAV_BAR_BOTTOM} + 1rem))`
            : "translateY(0)"
        }
        transition="transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      >
        <Tabs.Root
          variant="subtle"
          size="sm"
          fitted
          value={activeView}
          activationMode="manual"
          height="100%"
        >
          <Tabs.List height="100%" gap="1">
            {bar.map((item) => renderItem(item, "bar"))}
            {more.length > 0 && (
              <NavMoreMenu
                items={more}
                activeView={activeView}
                onSelect={handleClick}
                bar={barRef}
                entryCss={entryCss("bar")}
              />
            )}
          </Tabs.List>
        </Tabs.Root>
      </Box>

      {/* Landscape: the same floating surface down the left, on the cards'
          PAGE_GUTTER: its top lines up with the first card's. */}
      <Box
        {...FLOATING_SURFACE}
        display={{ base: "none", _landscape: "block" }}
        top={`calc(${HEADER_CLEARANCE} + ${PAGE_GUTTER})`}
        left={`calc(env(safe-area-inset-left, 0px) + ${PAGE_GUTTER})`}
        width={NAV_RAIL_WIDTH}
        height={`calc(var(--app-height, 100dvh) - ${HEADER_CLEARANCE} - ${PAGE_GUTTER} - ${NAV_RAIL_BOTTOM})`}
        // Off past the screen edge, shadow and all.
        transform={
          hidden
            ? `translateX(calc(-100% - ${PAGE_GUTTER} - env(safe-area-inset-left, 0px) - 1rem))`
            : "translateX(0)"
        }
        transition="transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      >
        <Tabs.Root
          variant="subtle"
          size="sm"
          orientation="vertical"
          value={activeView}
          activationMode="manual"
          height="100%"
        >
          <Tabs.List width="100%" height="100%" gap="1">
            {railTop.map((item) => renderItem(item, "rail"))}
            <Spacer />
            {railFoot.map((item) => renderItem(item, "rail"))}
          </Tabs.List>
        </Tabs.Root>
      </Box>
    </>
  );
}
