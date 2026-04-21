import { useState, useEffect } from "react";
import { Box, Text, HStack } from "@chakra-ui/react";
import {
  MdSkipNext,
  MdHome,
  MdAccessTime,
  MdPhotoLibrary,
  MdLightbulb,
  MdRefresh,
  MdRadar,
  MdTimer,
} from "react-icons/md";
import type { IconType } from "react-icons";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "../hooks/useSocket";
import { Divider } from "../components/Divider";
import { socket } from "../lib/socket";
import { getDeviceMode, setDeviceMode } from "../lib/deviceMode";
import { useThemeMode } from "../hooks/useThemeMode";
import { usePhotosConfig } from "../hooks/usePhotosConfig";
import type { ThemeModePreference } from "../lib/themeMode";

const VIEWS: { path: string; label: string; Icon: IconType }[] = [
  { path: "/home", label: "Overview", Icon: MdHome },
  { path: "/clock", label: "Clock", Icon: MdAccessTime },
  { path: "/photos", label: "Photos", Icon: MdPhotoLibrary },
  { path: "/lights", label: "Lights", Icon: MdLightbulb },
  { path: "/radar", label: "Radar", Icon: MdRadar },
  { path: "/timer", label: "Timer", Icon: MdTimer },
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
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<string | null>(null);
  const [deviceMode, setDeviceModeState] = useState(getDeviceMode);

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
    <Box
      width="100%"
      minHeight="100vh"
      bg="var(--theme-bg)"
      display="flex"
      justifyContent="center"
    >
      <Box
        width="100%"
        px="min(8vmin, 40px)"
        py="min(12vmin, 56px)"
        display="flex"
        flexDirection="column"
        css={{
          maxWidth: "560px",
          "@media (orientation: landscape)": {
            maxWidth: "960px",
          },
        }}
      >
        {/* Device mode buttons */}
        <HStack gap="min(2vmin, 10px)" mb="min(4.5vmin, 20px)">
          {(["frame", "controller"] as const).map((mode) => {
            const isActive = deviceMode === mode;
            const label = mode === "frame" ? "Use as display" : "Use as remote";
            return (
              <Box
                key={mode}
                as="button"
                onClick={() => {
                  setDeviceMode(mode);
                  setDeviceModeState(mode);
                  if (mode === "frame") window.location.href = "/home";
                }}
                flex="1"
                py="min(3vmin, 13px)"
                px="min(4vmin, 18px)"
                borderRadius="8px"
                border="1px solid"
                borderColor={isActive ? "var(--theme-fg-dim)" : "var(--theme-divider)"}
                bg="transparent"
                cursor="pointer"
                _active={{ opacity: 0.5 }}
                transition="border-color 0.15s"
              >
                <Text
                  fontSize="min(3.2vmin, 14px)"
                  color={isActive ? "var(--theme-fg)" : "var(--theme-fg-muted)"}
                  fontWeight={isActive ? "400" : "300"}
                  letterSpacing="0.02em"
                >
                  {label}
                </Text>
              </Box>
            );
          })}
        </HStack>
        <Divider mb="min(8vmin, 36px)" />

        {/* Header */}
        {deviceMode !== "frame" && <HStack justify="space-between" align="baseline" mb="min(8vmin, 36px)">
          <Text
            fontSize="min(5vmin, 28px)"
            color="var(--theme-fg)"
            fontWeight="300"
            letterSpacing="0.02em"
          >
            Remote
          </Text>
          <HStack gap="min(1.5vmin, 8px)" align="center">
            <Box
              width="8px"
              height="8px"
              borderRadius="full"
              bg={connected ? "green.400" : "var(--theme-fg-faint)"}
            />
            <Text fontSize="min(3vmin, 13px)" color="var(--theme-fg-faint)">
              {connected ? "connected" : "disconnected"}
            </Text>
          </HStack>
        </HStack>}

        {/* Body: stacked portrait, side-by-side landscape */}
        <Box
          css={{
            display: "flex",
            flexDirection: "column",
            gap: "min(10vmin, 48px)",
            "@media (orientation: landscape)": {
              flexDirection: "row",
              alignItems: "flex-start",
            },
          }}
        >
        {deviceMode !== "frame" && <Box flex="1" minWidth="0">
        {/* View grid */}
        <Box
          display="grid"
          gridTemplateColumns="1fr 1fr"
          gap="min(3vmin, 14px)"
          width="100%"
        >
          {VIEWS.map((v) => {
            const isActive = activeView === v.path;
            const isPhotos = v.path === "/photos";
            const Icon = v.Icon;

            return (
              <Box
                key={v.path}
                position="relative"
                onClick={() => changeView(v.path)}
                cursor="pointer"
                aspectRatio="1"
                borderRadius="12px"
                border="1px solid"
                borderColor={
                  isActive ? "var(--theme-fg-dim)" : "var(--theme-divider)"
                }
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                gap="min(2vmin, 10px)"
                _active={{ opacity: 0.5 }}
              >
                <Box
                  color={isActive ? "var(--theme-fg)" : "var(--theme-fg-dim)"}
                  fontSize="min(9vmin, 44px)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Icon />
                </Box>
                <Text
                  fontSize="min(3.6vmin, 16px)"
                  fontWeight={isActive ? "400" : "300"}
                  color={isActive ? "var(--theme-fg)" : "var(--theme-fg-dim)"}
                  letterSpacing="0.01em"
                >
                  {v.label}
                </Text>
                {isPhotos && (
                  <Box
                    as="button"
                    position="absolute"
                    top="min(2vmin, 10px)"
                    right="min(2vmin, 10px)"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      nextPhoto();
                    }}
                    color="var(--theme-fg-faint)"
                    _hover={{ color: "var(--theme-fg)" }}
                    display="flex"
                    alignItems="center"
                    p="min(1vmin, 6px)"
                  >
                    <MdSkipNext size={18} />
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {/* Refresh all frames */}
        <Box
          as="button"
          mt="min(3vmin, 14px)"
          width="100%"
          py="min(3.5vmin, 16px)"
          borderRadius="8px"
          bg="transparent"
          border="1px solid var(--theme-divider)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          gap="min(2vmin, 10px)"
          color="var(--theme-fg-dim)"
          _active={{ opacity: 0.5 }}
          onClick={() => socket.emit("refresh")}
        >
          <MdRefresh size={18} />
          <Text fontSize="min(3.6vmin, 16px)" fontWeight="300" letterSpacing="0.02em">
            Refresh displays
          </Text>
        </Box>

        </Box>}
        <Box flex="1" minWidth="0" display="flex" flexDirection="column" gap="min(10vmin, 48px)">
        {/* Display mode */}
        <Box>
          <HStack
            justify="space-between"
            align="baseline"
            mb="min(3vmin, 14px)"
          >
            <Text
              fontSize="min(3.2vmin, 14px)"
              color="var(--theme-fg-muted)"
              letterSpacing="0.12em"
              textTransform="uppercase"
            >
              Display mode
            </Text>
            {preference === "auto" && (
              <Text fontSize="min(2.8vmin, 13px)" color="var(--theme-fg-faint)">
                auto · {effectiveMode}
              </Text>
            )}
          </HStack>
          <HStack gap="min(2vmin, 10px)" width="100%">
            {THEME_MODES.map((m) => {
              const isActive = preference === m.value;
              return (
                <Box
                  key={m.value}
                  as="button"
                  flex="1"
                  py="min(3.5vmin, 16px)"
                  borderRadius="8px"
                  bg="transparent"
                  border="1px solid"
                  borderColor={
                    isActive ? "var(--theme-fg-dim)" : "var(--theme-divider)"
                  }
                  onClick={() => setPreference(m.value)}
                  _active={{ opacity: 0.5 }}
                >
                  <Text
                    fontSize="min(3.6vmin, 16px)"
                    fontWeight={isActive ? "400" : "300"}
                    color={isActive ? "var(--theme-fg)" : "var(--theme-fg-dim)"}
                    letterSpacing="0.02em"
                  >
                    {m.label}
                  </Text>
                </Box>
              );
            })}
          </HStack>
        </Box>

        {/* Album */}
        <Box>
          <Text
            fontSize="min(3.2vmin, 14px)"
            color="var(--theme-fg-muted)"
            letterSpacing="0.12em"
            textTransform="uppercase"
            mb="min(3vmin, 14px)"
          >
            Album
          </Text>
          <select
            style={{
              width: "100%",
              padding: "min(3.5vmin, 16px) min(3vmin, 14px)",
              borderRadius: "8px",
              background: "transparent",
              border: "1px solid var(--theme-divider)",
              color: "var(--theme-fg)",
              fontSize: "min(3.6vmin, 16px)",
              fontWeight: 300,
            }}
            value={photosConfig?.defaultAlbumId ?? ""}
            onChange={handleAlbumChange}
          >
            {!photosConfig?.defaultAlbumId && <option value="">—</option>}
            {photosConfig?.options.map((id) => (
              <option key={id} value={id} style={{ background: "#000" }}>
                {id}
              </option>
            ))}
          </select>
        </Box>
        </Box>
        </Box>
      </Box>
    </Box>
  );
}
