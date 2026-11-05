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
import type { Feature } from "../lib/features";
import { useSocket } from "../hooks/useSocket";
import { connectionLabel } from "../lib/connection";
import { reloadApp, useAppVersion } from "../lib/appVersion";
import { socket } from "../lib/socket";
import { getDeviceMode, setDeviceMode } from "../lib/deviceMode";
import { useThemeMode } from "../hooks/useThemeMode";
import { useHalloween } from "../hooks/useHalloween";
import { useFeatures } from "../hooks/useFeatures";
import { useFramesNavVisible, setNavVisible } from "../lib/navVisibility";
import { computeEffectiveMode } from "../lib/themeMode";
import { useDesktop } from "../hooks/useDesktop";
import { AppearanceBoard } from "../components/AppearanceBoard";
import { ControlColumns } from "../components/ControlColumns";
import { ThemeFields } from "../components/ThemeFields";
import { Board } from "../components/Board";
import { PageShell } from "../components/PageShell";
import { PageHeader } from "../components/PageHeader";
import { SectionTitle } from "../components/SectionTitle/SectionTitle";
import { VoiceStatusBoard } from "../components/VoiceStatusBoard";
import { AlbumSelect } from "../components/AlbumSelect";
import { NavLayoutBoard } from "../components/NavLayoutBoard";
import { UpdatesBoard } from "../components/UpdatesBoard";
import { NotificationsBoard } from "../components/NotificationsBoard";
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
  /** Offered only while the install has it set up (lib/features, 0.159.0). */
  feature?: Feature;
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
    feature: "photos",
  },
  {
    path: "/lights",
    label: "Lights",
    icon: RiLightbulbLine,
    activeIcon: RiLightbulbFill,
    feature: "lights",
  },
  {
    path: "/climate",
    label: "Climate",
    icon: IoThermometerOutline,
    activeIcon: IoThermometer,
    feature: "climate",
  },
  {
    path: "/energy",
    label: "Energy",
    icon: IoFlashOutline,
    activeIcon: IoFlash,
    feature: "energy",
  },
  {
    path: "/printer",
    label: "Printer",
    icon: Printer3dOutlineIcon,
    activeIcon: Printer3dIcon,
    feature: "printer",
  },
  {
    path: "/vacuum",
    label: "Vacuum",
    icon: TbVacuumCleaner,
    activeIcon: TbVacuumCleaner,
    feature: "vacuum",
  },
  {
    path: "/cameras",
    label: "Cameras",
    icon: IoVideocamOutline,
    activeIcon: IoVideocam,
    feature: "cameras",
  },
  {
    path: "/weather",
    label: "Weather",
    icon: IoPartlySunnyOutline,
    activeIcon: IoPartlySunny,
    feature: "weather",
  },
  {
    path: "/calendar",
    label: "Calendar",
    icon: IoCalendarOutline,
    activeIcon: IoCalendar,
  },
  { path: "/timer", label: "Timer", icon: IoTimerOutline, activeIcon: IoTimer },
  // Always listed here while a team is tracked, unlike the nav bar's tab
  // which only appears on game day — the remote is where you go to put the
  // frame on something, so the button should be there whether or not this
  // phone thinks a game is on.
  {
    path: "/football",
    label: "Football",
    icon: IoAmericanFootballOutline,
    activeIcon: IoAmericanFootball,
    feature: "football",
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
  // The frames' theme (the Display card's); a remote's own is the Device
  // tab's Appearance card (0.148.0).
  const { frames, setFramesPreference, setFramesPalette } = useThemeMode();
  const desktop = useDesktop();
  const [activeView, setActiveView] = useState<string | null>(null);
  const [deviceMode, setDeviceModeState] = useState(getDeviceMode);
  // The frames' nav: a remote's own never hides.
  const navVisible = useFramesNavVisible();
  const showViews = deviceMode !== "frame";
  const halloween = useHalloween();
  // Only what the install has set up (lib/features, 0.159.0; Photos with
  // Immich since 0.145.0, the album picker with it).
  const features = useFeatures();
  const photos = features.photos;
  const views = [
    ...VIEWS.filter((v) => !v.feature || features[v.feature]),
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
      {/* Three across on a phone; on a desktop as many 7.5rem tiles as the
          card holds — six in its 60rem at 1920x1080 (0.148.0, the user: "on
          desktop the view buttons are way too big … a row of at least six"). */}
      <SimpleGrid
        // One or the other: a templateColumns, even undefined, overrides
        // the template SimpleGrid makes of `columns`.
        {...(desktop
          ? { templateColumns: "repeat(auto-fill, minmax(7.5rem, 1fr))" }
          : { columns: 3 })}
        gap="3"
      >
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
          {/* The frames' clock is this one's; their system settings aren't. */}
          {frames.preference === "auto" && (
            <Badge>auto · {computeEffectiveMode("auto")}</Badge>
          )}
        </HStack>
      }
    >
      <Stack gap="5">
        <ThemeFields
          value={frames}
          onPreference={setFramesPreference}
          onPalette={setFramesPalette}
          helper={
            showViews
              ? "Every frame wears these. This remote's own are under Device."
              : "Every frame wears these; a remote has its own."
          }
        />

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
          <ControlColumns
            start={displayBoard}
            end={
              <>
                <ScreenBoard />
                {photos && albumBoard}
              </>
            }
          />
        </Tabs.Content>
        <Tabs.Content value="device" p="0">
          <ControlColumns
            start={
              <>
                {/* A remote's own theme; a frame wears the frames'. */}
                {showViews && <AppearanceBoard />}
                {/* Not on the kitchen frame: Fully Kiosk's WebView has no
                    push, and the frame is never the one to tell. */}
                {window.fully == null && <NotificationsBoard />}
                <SoftwareBoard />
                <UpdatesBoard />
              </>
            }
            end={
              <>
                <NavLayoutBoard />
                <VoiceStatusBoard />
              </>
            }
          />
        </Tabs.Content>
      </Tabs.Root>
    </PageShell>
  );
}
