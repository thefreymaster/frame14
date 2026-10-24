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
  Text,
} from "@chakra-ui/react";
import { MdSkipNext, MdRefresh, MdRadar, MdElectricBolt } from "react-icons/md";
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
} from "react-icons/io5";
import {
  RiHome5Line,
  RiHome5Fill,
  RiLightbulbLine,
  RiLightbulbFill,
} from "react-icons/ri";
import { TbVacuumCleaner } from "react-icons/tb";
import type { IconType } from "react-icons";
import { useNavigate } from "react-router";
import { useSocket } from "../hooks/useSocket";
import { useVersion } from "../hooks/useVersion";
import { socket } from "../lib/socket";
import { getDeviceMode, setDeviceMode } from "../lib/deviceMode";
import { useThemeMode } from "../hooks/useThemeMode";
import { useFramesNavVisible, setNavVisible } from "../lib/navVisibility";
import type { ThemeModePreference } from "../lib/themeMode";
import { Board } from "../components/Board";
import { PageShell } from "../components/PageShell";
import { PageHeader } from "../components/PageHeader";
import { SectionTitle } from "../components/SectionTitle/SectionTitle";
import { VoiceStatusBoard } from "../components/VoiceStatusBoard";
import { AlbumSelect } from "../components/AlbumSelect";
import { NavLayoutBoard } from "../components/NavLayoutBoard";
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
    path: "/power",
    label: "Power",
    icon: MdElectricBolt,
    activeIcon: MdElectricBolt,
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
  { path: "/radar", label: "Radar", icon: MdRadar, activeIcon: MdRadar },
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

const LOCAL_ONLY_PATHS = new Set(["/lights", "/radar", "/timer"]);

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

export function Control() {
  const { connected } = useSocket();
  const version = useVersion();
  const { preference, effectiveMode, setPreference } = useThemeMode();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<string | null>(null);
  const [deviceMode, setDeviceModeState] = useState(getDeviceMode);
  // The frames' nav: a remote's own never hides.
  const navVisible = useFramesNavVisible();

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

  function changeView(path: string) {
    if (LOCAL_ONLY_PATHS.has(path)) {
      navigate(path);
      return;
    }
    socket.emit("change", path.replace("/", ""));
    setActiveView(path);
  }

  return (
    <PageShell center maxW={{ portrait: "36rem", landscape: "60rem" }}>
      <PageHeader
        icon={<IoOptionsOutline />}
        title="Control"
        actions={
          <>
            {version && (
              <Text textStyle="sm" color="fg.muted">
                v{version}
              </Text>
            )}
            <Status value={connected ? "success" : "error"}>
              {connected ? "Connected" : "Disconnected"}
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

      {/* Body: stacked portrait, side-by-side landscape */}
      <Flex
        direction={{ base: "column", _landscape: "row" }}
        align={{ _landscape: "flex-start" }}
        gap="gutter"
      >
        {deviceMode !== "frame" && (
          <Box flex="1" minWidth="0">
            <Board title={<SectionTitle>Views</SectionTitle>}>
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
          </Box>
        )}
        <Flex flex="1" minWidth="0" direction="column" gap="gutter">
          {/* Display mode */}
          <Board
            title={
              <HStack justify="space-between" width="100%">
                <SectionTitle>Display</SectionTitle>
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

          {/* This device's nav: order and what it shows */}
          <NavLayoutBoard />

          {/* Voice */}
          <VoiceStatusBoard />

          {/* Album */}
          <Board title={<SectionTitle>Album</SectionTitle>}>
            <AlbumSelect />
          </Board>
        </Flex>
      </Flex>
    </PageShell>
  );
}
