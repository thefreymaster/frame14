import { useState, useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import {
  Badge,
  Box,
  Button,
  Field,
  HStack,
  IconButton,
  SimpleGrid,
  Stack,
  Tabs,
} from "@chakra-ui/react";
import { MdSkipNext, MdRefresh } from "react-icons/md";
import {
  IoTimeOutline,
  IoTime,
  IoImagesOutline,
  IoImages,
  IoTimerOutline,
  IoTimer,
  IoOptionsOutline,
  IoAmericanFootballOutline,
  IoAmericanFootball,
  IoFlashOutline,
  IoFlash,
  IoThermometerOutline,
  IoThermometer,
  IoPartlySunnyOutline,
  IoPartlySunny,
  IoCalendarOutline,
  IoCalendar,
  IoVideocamOutline,
  IoVideocam,
  IoGridOutline,
  IoContrastOutline,
  IoPhonePortraitOutline,
  IoBrowsersOutline,
  IoTabletPortraitOutline,
} from "react-icons/io5";
import {
  RiHome5Line,
  RiHome5Fill,
  RiLightbulbLine,
  RiLightbulbFill,
} from "react-icons/ri";
import { TbVacuumCleaner } from "react-icons/tb";
import { GiPumpkinLantern } from "react-icons/gi";
import type { IconType } from "react-icons";
import { useSocket } from "../hooks/useSocket";
import { connectionLabel } from "../lib/connection";
import { reloadApp, useAppVersion } from "../lib/appVersion";
import { socket } from "../lib/socket";
import { getDeviceMode, setDeviceMode } from "../lib/deviceMode";
import { useThemeMode } from "../hooks/useThemeMode";
import { useHalloween } from "../hooks/useHalloween";
import { usePhotosEnabled } from "../hooks/usePhotosEnabled";
import { useFramesNavVisible, setNavVisible } from "../lib/navVisibility";
import type { ThemeModePreference } from "../lib/themeMode";
import {
  isThemePalette,
  PALETTES,
  THEME_PALETTES,
} from "../lib/themePalettes";
import { PaletteSwatch } from "../components/PaletteSwatch";
import { Board } from "../components/Board";
import { PageShell } from "../components/PageShell";
import { PageHeader } from "../components/PageHeader";
import { SectionTitle } from "../components/SectionTitle/SectionTitle";
import { VoiceStatusBoard } from "../components/VoiceStatusBoard";
import { AlbumSelect } from "../components/AlbumSelect";
import { NavLayoutBoard } from "../components/NavLayoutBoard";
import { UpdatesBoard } from "../components/UpdatesBoard";
import { SoftwareBoard } from "../components/SoftwareBoard";
import { ScreenBoard } from "../components/ScreenBoard";
import { Printer3dIcon, Printer3dOutlineIcon } from "../lib/printerIcons";
import { toaster } from "../components/ui/toaster";
import { Tooltip } from "../components/ui/tooltip";
import { SegmentedControl } from "../components/ui/segmented-control";
import { Status } from "../components/ui/status";
import { Switch } from "../components/ui/switch";

type View = {
  path: string;
  label: string;
  icon: IconType;
  activeIcon: IconType;
};

const VIEWS: View[] = [
  {
    path: "/home",
    label: "Overview",
    icon: RiHome5Line,
    activeIcon: RiHome5Fill,
  },
  { path: "/clock", label: "Clock", icon: IoTimeOutline, activeIcon: IoTime },
  {
    path: "/photos",
    label: "Photos",
    icon: IoImagesOutline,
    activeIcon: IoImages,
  },
  {
    path: "/lights",
    label: "Lights",
    icon: RiLightbulbLine,
    activeIcon: RiLightbulbFill,
  },
  {
    path: "/climate",
    label: "Climate",
    icon: IoThermometerOutline,
    activeIcon: IoThermometer,
  },
  {
    path: "/energy",
    label: "Energy",
    icon: IoFlashOutline,
    activeIcon: IoFlash,
  },
  {
    path: "/printer",
    label: "Printer",
    icon: Printer3dOutlineIcon,
    activeIcon: Printer3dIcon,
  },
  {
    path: "/vacuum",
    label: "Vacuum",
    icon: TbVacuumCleaner,
    activeIcon: TbVacuumCleaner,
  },
  {
    path: "/cameras",
    label: "Cameras",
    icon: IoVideocamOutline,
    activeIcon: IoVideocam,
  },
  {
    path: "/weather",
    label: "Weather",
    icon: IoPartlySunnyOutline,
    activeIcon: IoPartlySunny,
  },
  {
    path: "/calendar",
    label: "Calendar",
    icon: IoCalendarOutline,
    activeIcon: IoCalendar,
  },
  { path: "/timer", label: "Timer", icon: IoTimerOutline, activeIcon: IoTimer },
  // Always listed here, unlike the nav bar's tab which only appears on game
  // day — the remote is where you go to put the frame on something, so the
  // button should be there whether or not this phone thinks a game is on.
  {
    path: "/football",
    label: "Football",
    icon: IoAmericanFootballOutline,
    activeIcon: IoAmericanFootball,
  },
];

// Oct 30 and 31 only (useHalloween), after the year-round views: like the
// nav's entry it comes and goes with the date.
const HALLOWEEN_VIEW: View = {
  path: "/halloween",
  label: "Halloween",
  icon: GiPumpkinLantern,
  activeIcon: GiPumpkinLantern,
};

// Auto follows the daylight window (07:00–19:00), Device the system's light /
// dark setting — each panel its own (lib/themeMode).
const THEME_MODES: { value: ThemeModePreference; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "device", label: "Device" },
  { value: "bright", label: "Bright" },
  { value: "dark", label: "Dark" },
];

// The palettes (lib/themePalettes), each with its swatch.
const PALETTE_ITEMS = THEME_PALETTES.map((value) => ({
  value,
  label: (
    <HStack gap="2">
      <PaletteSwatch palette={value} />
      {PALETTES[value].label}
    </HStack>
  ),
}));

const DEVICE_MODES = [
  { value: "frame", label: "Use as frame" },
  { value: "controller", label: "Use as remote" },
] as const;

function nextPhoto() {
  socket.emit("next_photo");
}

/**
 * The phone's tabs: the sections grouped by what they act on. The views the
 * frames show; how the frames look and which album they play; and this
 * device's own nav and voice.
 */
const TABS = [
  { value: "views", label: "Views", icon: IoGridOutline },
  { value: "display", label: "Display", icon: IoContrastOutline },
  { value: "device", label: "Device", icon: IoPhonePortraitOutline },
] as const;

export function Control() {
  const { status: connection } = useSocket();
  const version = useAppVersion();
  const { preference, palette, effectiveMode, setPreference, setPalette } =
    useThemeMode();
  const [activeView, setActiveView] = useState<string | null>(null);
  const [deviceMode, setDeviceModeState] = useState(getDeviceMode);
  // The frames' nav: a remote's own never hides.
  const navVisible = useFramesNavVisible();
  const showViews = deviceMode !== "frame";
  const halloween = useHalloween();
  // Photos only while Immich is set up (0.145.0), the album picker with it.
  const photos = usePhotosEnabled();
  const views = [
    ...VIEWS.filter((v) => photos || v.path !== "/photos"),
    ...(halloween ? [HALLOWEEN_VIEW] : []),
  ];
  // The tab — every device's since 0.139 (the user: "add the tabs that the
  // settings route has on mobile to all devices"; a phone's alone before) —
  // is the sub-route (0.138): /control/views, /display, /device, the first
  // the device has for the page alone or a tab it hasn't got (Views is a
  // remote's), put into the address below.
  const navigate = useNavigate();
  const { tab: rawTab } = useParams();
  const tabs = TABS.filter((t) => showViews || t.value !== "views");
  const tab = tabs.some((t) => t.value === rawTab)
    ? (rawTab as string)
    : tabs[0].value;
  const setTab = (next: string) =>
    void navigate(`/control/${next}`, { replace: true });

  useEffect(() => {
    function onCurrentView(view: string) {
      setActiveView(`/${view}`);
    }
    function onChangeView(view: string) {
      setActiveView(`/${view}`);
    }
    socket.on("current_view", onCurrentView);
    socket.on("change_view", onChangeView);
    return () => {
      socket.off("current_view", onCurrentView);
      socket.off("change_view", onChangeView);
    };
  }, []);

  // Every tile sends the frames there (0.127): the card is the frames'
  // remote, and this device's nav is the way to its own pages. Lights,
  // Climate, Weather, Calendar and Timer used to open on the remote instead.
  function changeView(path: string) {
    socket.emit("change", path.replace("/", ""));
    setActiveView(path);
  }

  const viewsBoard = (
    <Board
      title={<SectionTitle icon={<IoBrowsersOutline />}>Views</SectionTitle>}
    >
      <SimpleGrid columns={3} gap="3">
        {views.map((v) => {
          const isActive = activeView === v.path;
          const Icon = isActive ? v.activeIcon : v.icon;
          return (
            <Box key={v.path} position="relative" minW="0">
              <Button
                variant={isActive ? "solid" : "outline"}
                aria-pressed={isActive}
                aria-label={v.label}
                onClick={() => changeView(v.path)}
                width="100%"
                height="auto"
                // A rounded rectangle, not the pill every other button
                // is: a square tile at full radius is a circle. Its corners
                // are `sm`, concentric with the card's (0.145.4: the card's
                // own 0.75rem before, the corner tiles' curves fighting it).
                aspectRatio="4 / 3"
                borderRadius="sm"
                flexDirection="column"
                gap="2"
              >
                <Icon />
                {v.label}
              </Button>
              {v.path === "/photos" && (
                <Tooltip content="Next photo" showArrow>
                  <IconButton
                    aria-label="Next photo"
                    variant="ghost"
                    size="xs"
                    position="absolute"
                    top="1"
                    right="1"
                    onClick={nextPhoto}
                  >
                    <MdSkipNext />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          );
        })}
      </SimpleGrid>
    </Board>
  );

  const displayBoard = (
    <Board
      title={
        <HStack justify="space-between" width="100%">
          <SectionTitle icon={<IoTabletPortraitOutline />}>
            Display
          </SectionTitle>
          {(preference === "auto" || preference === "device") && (
            <Badge>
              {preference} · {effectiveMode}
            </Badge>
          )}
        </HStack>
      }
    >
      <Stack gap="5">
        <Field.Root>
          <Field.Label>Theme</Field.Label>
          <SegmentedControl
            items={THEME_MODES}
            value={preference}
            aria-label="Theme"
            onValueChange={(e) => {
              if (e.value) setPreference(e.value as ThemeModePreference);
            }}
          />
        </Field.Root>

        <Field.Root>
          <Field.Label>Colors</Field.Label>
          <SegmentedControl
            items={PALETTE_ITEMS}
            value={palette}
            aria-label="Colors"
            onValueChange={(e) => {
              if (isThemePalette(e.value)) setPalette(e.value);
            }}
          />
        </Field.Root>

        <Switch
          checked={navVisible}
          onCheckedChange={(e) => setNavVisible(e.checked)}
        >
          Show navigation
        </Switch>

        <Button
          variant="outline"
          onClick={() => {
            socket.emit("refresh");
            toaster.create({
              title: "Refreshing displays",
              type: "info",
            });
          }}
        >
          <MdRefresh />
          Refresh displays
        </Button>
      </Stack>
    </Board>
  );

  const albumBoard = (
    <Board
      title={<SectionTitle icon={<IoImagesOutline />}>Album</SectionTitle>}
    >
      <AlbumSelect />
    </Board>
  );

  return (
    <PageShell center maxW={{ portrait: "36rem", landscape: "60rem" }}>
      <PageHeader
        icon={<IoOptionsOutline />}
        title="Control"
        actions={
          <>
            {/* The running version was here until 0.121; SoftwareBoard
                (Device) has it, with the installed and latest ones. */}
            {/* This page is older than the add-on: reload into the new one. */}
            {version.outdated && (
              <Button
                size="xs"
                variant="plain"
                colorPalette="blue"
                color="colorPalette.fg"
                px="0"
                textStyle="sm"
                textDecoration="underline"
                textUnderlineOffset="3px"
                aria-label={`Update to v${version.installed}`}
                onClick={reloadApp}
              >
                Update
              </Button>
            )}
            <Status
              value={connection === "connected" ? "success" : "error"}
              // Grey while connecting, as the header's icon is.
              colorPalette={connection === "connecting" ? "gray" : undefined}
            >
              {connectionLabel(connection)}
            </Status>
          </>
        }
      >
        <Field.Root>
          <Field.Label>Device mode</Field.Label>
          <SegmentedControl
            items={[...DEVICE_MODES]}
            value={deviceMode}
            aria-label="Device mode"
            onValueChange={(e) => {
              const mode = e.value as "frame" | "controller" | null;
              if (!mode) return;
              setDeviceMode(mode);
              setDeviceModeState(mode);
              if (mode === "frame") window.location.href = "/home";
            }}
          />
        </Field.Root>
      </PageHeader>

      {rawTab !== tab && <Navigate to={`/control/${tab}`} replace />}
      <Tabs.Root
        value={tab}
        onValueChange={(e) => setTab(e.value)}
        variant="line"
        fitted
        display="flex"
        flexDirection="column"
        gap="gutter"
      >
        <Tabs.List>
          {tabs.map((t) => (
            <Tabs.Trigger key={t.value} value={t.value}>
              <t.icon />
              {t.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {showViews && (
          <Tabs.Content value="views" p="0">
            {viewsBoard}
          </Tabs.Content>
        )}
        <Tabs.Content value="display" p="0">
          <Stack gap="gutter">
            {displayBoard}
            <ScreenBoard />
            {photos && albumBoard}
          </Stack>
        </Tabs.Content>
        <Tabs.Content value="device" p="0">
          <Stack gap="gutter">
            <SoftwareBoard />
            <UpdatesBoard />
            <NavLayoutBoard />
            <VoiceStatusBoard />
          </Stack>
        </Tabs.Content>
      </Tabs.Root>
    </PageShell>
  );
}
