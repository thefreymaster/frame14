import { useState, useEffect } from "react";
import {
  Badge,
  Box,
  Button,
  Field,
  Flex,
  HStack,
  IconButton,
  SimpleGrid,
  Stack,
  Tabs,
  useMediaQuery,
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
  // IoPlayCircleOutline,
  // media page
  // IoPlayCircle,
  // media page
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
import type { IconType } from "react-icons";
import { useSocket } from "../hooks/useSocket";
import { connectionLabel } from "../lib/connection";
import { reloadApp, useAppVersion } from "../lib/appVersion";
import { socket } from "../lib/socket";
import { getDeviceMode, setDeviceMode } from "../lib/deviceMode";
import { HOME_ONE_COLUMN_QUERY } from "../lib/homeLayout";
import { useThemeMode } from "../hooks/useThemeMode";
import { useFramesNavVisible, setNavVisible } from "../lib/navVisibility";
// The lights strip is off for now (0.91, see Layout); its switch with it.
// import {
//   setLightStripShown,
//   useLightStripShown,
// } from "../lib/lightStripVisibility";
// import { useDesktop } from "../hooks/useDesktop";
import type { ThemeModePreference } from "../lib/themeMode";
import { Board } from "../components/Board";
import { PageShell } from "../components/PageShell";
import { PageHeader } from "../components/PageHeader";
import { SectionTitle } from "../components/SectionTitle/SectionTitle";
import { VoiceStatusBoard } from "../components/VoiceStatusBoard";
import { AlbumSelect } from "../components/AlbumSelect";
import { NavLayoutBoard } from "../components/NavLayoutBoard";
import { UpdatesBoard } from "../components/UpdatesBoard";
import { SoftwareBoard } from "../components/SoftwareBoard";
import { Printer3dIcon, Printer3dOutlineIcon } from "../lib/printerIcons";
import { toaster } from "../components/ui/toaster";
import { Tooltip } from "../components/ui/tooltip";
import { SegmentedControl } from "../components/ui/segmented-control";
import { Status } from "../components/ui/status";
import { Switch } from "../components/ui/switch";

const VIEWS: {
  path: string;
  label: string;
  icon: IconType;
  activeIcon: IconType;
}[] = [
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
  // The Media page is off for now (0.109, see lib/navItems).
  // {
  //   path: "/media",
  //   label: "Media",
  //   icon: IoPlayCircleOutline,
  //   activeIcon: IoPlayCircle,
  // }, // media page
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

const THEME_MODES: { value: ThemeModePreference; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "bright", label: "Bright" },
  { value: "dark", label: "Dark" },
];

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
  const { preference, effectiveMode, setPreference } = useThemeMode();
  const [activeView, setActiveView] = useState<string | null>(null);
  const [deviceMode, setDeviceModeState] = useState(getDeviceMode);
  // The frames' nav: a remote's own never hides.
  const navVisible = useFramesNavVisible();
  // The lights strip along the bottom is a desktop's alone, so its switch
  // shows there alone; this device's setting, not the frames'.
  // const desktop = useDesktop(); // lights strip
  // const lightStripShown = useLightStripShown(); // lights strip
  // A phone (one column) gets the sections in tabs rather than one long page.
  // Measured before the first paint, so a phone never flashes the long page.
  const [phone] = useMediaQuery([HOME_ONE_COLUMN_QUERY], { ssr: false });
  const showViews = deviceMode !== "frame";
  const [tab, setTab] = useState<string>(showViews ? "views" : "display");

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
    <Board title={<SectionTitle icon={<IoBrowsersOutline />}>Views</SectionTitle>}>
      <SimpleGrid columns={3} gap="3">
        {VIEWS.map((v) => {
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
                // is: a square tile at full radius is a circle.
                aspectRatio="4 / 3"
                borderRadius="xl"
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
          <SectionTitle icon={<IoTabletPortraitOutline />}>Display</SectionTitle>
          {preference === "auto" && <Badge>auto · {effectiveMode}</Badge>}
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

        <Switch
          checked={navVisible}
          onCheckedChange={(e) => setNavVisible(e.checked)}
        >
          Show navigation
        </Switch>

        {/* lights strip (off for now, 0.91):
        {desktop && (
          <Field.Root>
            <Switch
              checked={lightStripShown}
              onCheckedChange={(e) => setLightStripShown(e.checked)}
            >
              Show lights strip
            </Switch>
            <Field.HelperText>
              The row of lights along the bottom of this screen.
            </Field.HelperText>
          </Field.Root>
        )} */}

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
    <Board title={<SectionTitle icon={<IoImagesOutline />}>Album</SectionTitle>}>
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

      {phone ? (
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
            {TABS.filter((t) => showViews || t.value !== "views").map((t) => (
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
              {albumBoard}
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
      ) : (
        /* Body: stacked portrait, side-by-side landscape */
        <Flex
          direction={{ base: "column", _landscape: "row" }}
          align={{ _landscape: "flex-start" }}
          gap="gutter"
        >
          {showViews && (
            <Box flex="1" minWidth="0">
              {viewsBoard}
            </Box>
          )}
          <Flex flex="1" minWidth="0" direction="column" gap="gutter">
            {displayBoard}

            {/* The versions: this page, installed, the store's latest */}
            <SoftwareBoard />

            {/* This device's auto refresh on an update */}
            <UpdatesBoard />

            {/* This device's nav: order and what it shows */}
            <NavLayoutBoard />

            {/* Voice */}
            <VoiceStatusBoard />

            {albumBoard}
          </Flex>
        </Flex>
      )}
    </PageShell>
  );
}
