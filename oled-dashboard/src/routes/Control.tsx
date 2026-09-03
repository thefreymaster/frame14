import { useState, useEffect } from "react";
import { Box, Text, HStack } from "@chakra-ui/react";
import { MdSkipNext, MdRefresh, MdRadar, MdElectricBolt } from "react-icons/md";
import {
  IoTimeOutline,
  IoTime,
  IoImagesOutline,
  IoImages,
  IoTimerOutline,
  IoTimer,
  IoEyeOutline,
  IoEyeOffOutline,
  IoOptionsOutline,
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
import { useNavVisible, toggleNavVisible } from "../lib/navVisibility";
import type { ThemeModePreference } from "../lib/themeMode";
import { Board } from "../components/Board";
import { PageShell } from "../components/PageShell";
import { PageHeader } from "../components/PageHeader";
import { ControlButton } from "../components/ControlButton";
import { SectionTitle } from "../components/SectionTitle/SectionTitle";
import { VoiceStatusBoard } from "../components/VoiceStatusBoard";
import {
  CARD_RADIUS,
  CHIP_GAP,
  CHIP_PADDING_X,
  CHIP_PADDING_Y,
  CHIP_RADIUS,
  GRID_GAP,
} from "../lib/surfaces";

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
];

const LOCAL_ONLY_PATHS = new Set(["/lights", "/radar", "/timer"]);

const THEME_MODES: { value: ThemeModePreference; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "bright", label: "Bright" },
  { value: "dark", label: "Dark" },
];

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
          <HStack gap="1vmin" align="center">
            <Box
              width="1vmin"
              minWidth="6px"
              height="1vmin"
              minHeight="6px"
              borderRadius="full"
              bg={connected ? "green.400" : "var(--theme-fg-faint)"}
            />
            <Text
              fontSize="1.8vmin"
              fontWeight="400"
              color="var(--theme-fg-faint)"
              letterSpacing="0.08em"
              whiteSpace="nowrap"
            >
              {connected ? "CONNECTED" : "DISCONNECTED"}
            </Text>
          </HStack>
        }
      >
        {/* Device mode buttons */}
        <HStack gap={CHIP_GAP} mt="1.5vmin">
          {(["frame", "controller"] as const).map((mode) => {
            const isActive = deviceMode === mode;
            const label = mode === "frame" ? "Use as frame" : "Use as remote";
            return (
              <ControlButton
                key={mode}
                grow
                active={isActive}
                onClick={() => {
                  setDeviceMode(mode);
                  setDeviceModeState(mode);
                  if (mode === "frame") window.location.href = "/home";
                }}
              >
                <Text
                  fontSize="2.2vmin"
                  fontWeight={isActive ? "500" : "300"}
                  letterSpacing="0.02em"
                  whiteSpace="nowrap"
                >
                  {label}
                </Text>
              </ControlButton>
            );
          })}
        </HStack>
      </PageHeader>

      {/* Body: stacked portrait, side-by-side landscape */}
      <Box
        css={{
          display: "flex",
          flexDirection: "column",
          gap: GRID_GAP,
          "@media (orientation: landscape)": {
            flexDirection: "row",
            alignItems: "flex-start",
          },
        }}
      >
        {deviceMode !== "frame" && (
          <Box flex="1" minWidth="0">
            <Board title={<SectionTitle>VIEWS</SectionTitle>}>
              {/* View grid */}
              <Box
                display="grid"
                gridTemplateColumns="1fr 1fr 1fr"
                gap={CHIP_GAP}
                width="100%"
              >
                {VIEWS.map((v) => {
                  const isActive = activeView === v.path;
                  const isPhotos = v.path === "/photos";
                  const Icon = isActive ? v.activeIcon : v.icon;

                  return (
                    <ControlButton
                      key={v.path}
                      square
                      radius={CARD_RADIUS}
                      active={isActive}
                      onClick={() => changeView(v.path)}
                      label={v.label}
                    >
                      <Box
                        color={
                          isActive ? "var(--theme-fg)" : "var(--theme-fg-dim)"
                        }
                        fontSize="5vmin"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Icon />
                      </Box>
                      <Text
                        fontSize="2.2vmin"
                        fontWeight={isActive ? "500" : "300"}
                        letterSpacing="0.01em"
                      >
                        {v.label}
                      </Text>
                      {isPhotos && (
                        <Box
                          as="span"
                          role="button"
                          aria-label="Next photo"
                          position="absolute"
                          top="1.2vmin"
                          right="1.2vmin"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            nextPhoto();
                          }}
                          color="var(--theme-fg-faint)"
                          _hover={{ color: "var(--theme-fg)" }}
                          display="flex"
                          alignItems="center"
                          fontSize="2.8vmin"
                        >
                          <MdSkipNext />
                        </Box>
                      )}
                    </ControlButton>
                  );
                })}
              </Box>
            </Board>
          </Box>
        )}
        <Box
          flex="1"
          minWidth="0"
          display="flex"
          flexDirection="column"
          gap={GRID_GAP}
        >
          {/* Display mode */}
          <Board
            title={
              <HStack justify="space-between" align="baseline" width="100%">
                <SectionTitle>DISPLAY</SectionTitle>
                {preference === "auto" && (
                  <Text fontSize="1.8vmin" color="var(--theme-fg-faint)">
                    auto · {effectiveMode}
                  </Text>
                )}
              </HStack>
            }
          >
            <HStack gap={CHIP_GAP} width="100%">
              {THEME_MODES.map((m) => {
                const isActive = preference === m.value;
                return (
                  <ControlButton
                    key={m.value}
                    grow
                    active={isActive}
                    onClick={() => setPreference(m.value)}
                  >
                    <Text
                      fontSize="2.4vmin"
                      fontWeight={isActive ? "500" : "300"}
                      letterSpacing="0.02em"
                    >
                      {m.label}
                    </Text>
                  </ControlButton>
                );
              })}
            </HStack>

            {/* Refresh all frames */}
            <HStack mt={CHIP_GAP} width="100%">
              <ControlButton grow onClick={() => socket.emit("refresh")}>
                <Box fontSize="2.8vmin" display="flex">
                  <MdRefresh />
                </Box>
                <Text
                  fontSize="2.4vmin"
                  fontWeight="300"
                  letterSpacing="0.02em"
                >
                  Refresh displays
                </Text>
              </ControlButton>
            </HStack>

            {/* Show/hide nav */}
            <HStack mt={CHIP_GAP} width="100%">
              <ControlButton grow onClick={() => toggleNavVisible()}>
                <Box fontSize="2.8vmin" display="flex">
                  {navVisible ? <IoEyeOffOutline /> : <IoEyeOutline />}
                </Box>
                <Text
                  fontSize="2.4vmin"
                  fontWeight="300"
                  letterSpacing="0.02em"
                >
                  {navVisible ? "Hide navigation" : "Show navigation"}
                </Text>
              </ControlButton>
            </HStack>
          </Board>

          {/* Voice */}
          <VoiceStatusBoard />

          {/* Album */}
          <Board title={<SectionTitle>ALBUM</SectionTitle>}>
            <select
              style={{
                width: "100%",
                padding: `${CHIP_PADDING_Y} ${CHIP_PADDING_X}`,
                borderRadius: CHIP_RADIUS,
                // Fill, not outline — matches every other control on the page
                // and stays visible when the palette flips to bright.
                background: "var(--theme-surface-2)",
                border: "none",
                color: "var(--theme-fg)",
                fontSize: "2.4vmin",
                fontWeight: 300,
              }}
              value={photosConfig?.defaultAlbumId ?? ""}
              onChange={handleAlbumChange}
            >
              {!photosConfig?.defaultAlbumId && <option value="">—</option>}
              {photosConfig?.options.map((id) => {
                const album = albums?.find((a) => a.id === id);
                return (
                  <option
                    key={id}
                    value={id}
                    style={{
                      background: "var(--theme-surface-2)",
                      color: "var(--theme-fg)",
                    }}
                  >
                    {album?.albumName ?? id}
                  </option>
                );
              })}
            </select>
          </Board>
        </Box>
      </Box>
    </PageShell>
  );
}
