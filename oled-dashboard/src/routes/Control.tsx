import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  IconButton,
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
import type { IconType } from "react-icons";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "../hooks/useSocket";
import { socket } from "../lib/socket";
import { getDeviceMode, setDeviceMode } from "../lib/deviceMode";
import { useThemeMode } from "../hooks/useThemeMode";
import { usePhotosConfig } from "../hooks/usePhotosConfig";
import { useImmichAlbums } from "../hooks/useImmichAlbums";
import { useNavVisible, setNavVisible } from "../lib/navVisibility";
import type { ThemeModePreference } from "../lib/themeMode";
import { Board } from "../components/Board";
import { PageShell } from "../components/PageShell";
import { PageHeader } from "../components/PageHeader";
import { SectionTitle } from "../components/SectionTitle/SectionTitle";
import { VoiceStatusBoard } from "../components/VoiceStatusBoard";
import { toaster } from "../components/ui/toaster";
import { Tooltip } from "../components/ui/tooltip";
import { SegmentedControl } from "../components/ui/segmented-control";
import { Status } from "../components/ui/status";
import { Switch } from "../components/ui/switch";
import {
  NativeSelectField,
  NativeSelectRoot,
} from "../components/ui/native-select";

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
  const { preference, effectiveMode, setPreference } = useThemeMode();
  const { data: photosConfig } = usePhotosConfig();
  const { data: albums } = useImmichAlbums();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<string | null>(null);
  const [deviceMode, setDeviceModeState] = useState(getDeviceMode);
  const navVisible = useNavVisible();

  async function handleAlbumChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const option = e.target.value;
    if (!option) return;
    await fetch("/api/photos/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ option }),
    });
    queryClient.invalidateQueries({ queryKey: ["photos", "config"] });
    const name = albums?.find((a) => a.id === option)?.albumName ?? option;
    toaster.create({
      title: "Album changed",
      description: name,
      type: "success",
    });
  }

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
    <PageShell center maxW={{ portrait: "560px", landscape: "960px" }}>
      <PageHeader
        icon={<IoOptionsOutline />}
        title="CONTROL"
        actions={
          <Status
            value="success"
            size="panel"
            colorPalette={connected ? "green" : "gray"}
            color="fg.faint"
            whiteSpace="nowrap"
          >
            {connected ? "CONNECTED" : "DISCONNECTED"}
          </Status>
        }
      >
        {/* Device mode */}
        <SegmentedControl
          fitted
          mt="1.5vmin"
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
      </PageHeader>

      {/* Body: stacked portrait, side-by-side landscape */}
      <Flex
        direction={{ base: "column", _landscape: "row" }}
        align={{ _landscape: "flex-start" }}
        gap="gutter"
      >
        {deviceMode !== "frame" && (
          <Box flex="1" minWidth="0">
            <Board title={<SectionTitle>VIEWS</SectionTitle>}>
              <Grid templateColumns="1fr 1fr 1fr" gap="chipGap" width="100%">
                {VIEWS.map((v) => {
                  const isActive = activeView === v.path;
                  const Icon = isActive ? v.activeIcon : v.icon;
                  return (
                    <Box key={v.path} position="relative" minW="0">
                      <Button
                        variant="chip"
                        size="tile"
                        width="100%"
                        aria-pressed={isActive}
                        aria-label={v.label}
                        onClick={() => changeView(v.path)}
                      >
                        <Icon />
                        {v.label}
                      </Button>
                      {v.path === "/photos" && (
                        <Tooltip content="Next photo" showArrow>
                          <IconButton
                            aria-label="Next photo"
                            variant="plain"
                            position="absolute"
                            top="0.6vmin"
                            right="0.6vmin"
                            minW="0"
                            boxSize="5vmin"
                            color="fg.faint"
                            _hover={{ color: "fg" }}
                            _icon={{ width: "2.8vmin", height: "2.8vmin" }}
                            onClick={nextPhoto}
                          >
                            <MdSkipNext />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  );
                })}
              </Grid>
            </Board>
          </Box>
        )}
        <Flex flex="1" minWidth="0" direction="column" gap="gutter">
          {/* Display mode */}
          <Board
            title={
              <HStack justify="space-between" align="baseline" width="100%">
                <SectionTitle>DISPLAY</SectionTitle>
                {preference === "auto" && (
                  <Text fontSize="1.8vmin" color="fg.faint">
                    auto · {effectiveMode}
                  </Text>
                )}
              </HStack>
            }
          >
            <SegmentedControl
              fitted
              items={THEME_MODES}
              value={preference}
              aria-label="Theme"
              onValueChange={(e) => {
                if (e.value) setPreference(e.value as ThemeModePreference);
              }}
            />

            {/* Refresh all frames */}
            <Button
              variant="chip"
              size="chip"
              width="100%"
              mt="chipGap"
              fontSize="2.4vmin"
              onClick={() => {
                socket.emit("refresh");
                toaster.create({ title: "Refreshing displays", type: "info" });
              }}
            >
              <MdRefresh />
              Refresh displays
            </Button>

            {/* Show/hide nav */}
            <Switch
              size="panel"
              colorPalette="teal"
              checked={navVisible}
              onCheckedChange={(e) => setNavVisible(e.checked)}
              layerStyle="chip"
              width="100%"
              mt="chipGap"
              justifyContent="space-between"
              flexDirection="row-reverse"
              color="fg.dim"
            >
              Show navigation
            </Switch>
          </Board>

          {/* Voice */}
          <VoiceStatusBoard />

          {/* Album */}
          <Board title={<SectionTitle>ALBUM</SectionTitle>}>
            <NativeSelectRoot variant="chip" size="panel">
              <NativeSelectField
                aria-label="Photo album"
                value={photosConfig?.defaultAlbumId ?? ""}
                onChange={handleAlbumChange}
              >
                {!photosConfig?.defaultAlbumId && <option value="">—</option>}
                {photosConfig?.options.map((id) => {
                  const album = albums?.find((a) => a.id === id);
                  return (
                    <option key={id} value={id}>
                      {album?.albumName ?? id}
                    </option>
                  );
                })}
              </NativeSelectField>
            </NativeSelectRoot>
          </Board>
        </Flex>
      </Flex>
    </PageShell>
  );
}
