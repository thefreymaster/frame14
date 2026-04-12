import { useState, useEffect } from "react";
import { Box, Text, HStack, VStack } from "@chakra-ui/react";
import { MdSkipNext } from "react-icons/md";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "../hooks/useSocket";
import { socket } from "../lib/socket";
import { setDeviceMode } from "../lib/deviceMode";
import { useThemeMode } from "../hooks/useThemeMode";
import { usePhotosConfig } from "../hooks/usePhotosConfig";
import type { ThemeModePreference } from "../lib/themeMode";

const VIEWS = [
  { path: "/home", label: "Overview" },
  { path: "/clock", label: "Analog Clock" },
  { path: "/digital", label: "Digital Clock" },
  { path: "/photos", label: "Photo Slideshow" },
  { path: "/blank", label: "Blank Screen" },
];

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
  const [activeView, setActiveView] = useState<string | null>(null);

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
        maxWidth="560px"
        px="min(8vmin, 40px)"
        py="min(12vmin, 56px)"
        display="flex"
        flexDirection="column"
      >
      {/* Use as frame */}
      <Text
        fontSize="min(3.5vmin, 15px)"
        color="var(--theme-fg-faint)"
        cursor="pointer"
        _active={{ opacity: 0.5 }}
        mb="min(4.5vmin, 20px)"
        onClick={() => {
          setDeviceMode("frame");
          window.location.href = "/home";
        }}
      >
        Use as display frame
      </Text>
      <Box height="1px" bg="var(--theme-divider)" mb="min(8vmin, 36px)" />

      {/* Header */}
      <HStack justify="space-between" align="baseline" mb="min(8vmin, 36px)">
        <Text
          fontSize="min(5vmin, 28px)"
          color="var(--theme-fg)"
          fontWeight="300"
          letterSpacing="0.02em"
        >
          Control
        </Text>
        <HStack gap="min(1.5vmin, 8px)" align="center">
          <Box
            width="5px"
            height="5px"
            borderRadius="full"
            bg={connected ? "green.700" : "var(--theme-fg-faint)"}
          />
          <Text fontSize="min(3vmin, 13px)" color="var(--theme-fg-faint)">
            {connected ? "connected" : "disconnected"}
          </Text>
        </HStack>
      </HStack>

      {/* View rows */}
      <VStack gap={0} align="stretch" width="100%">
        {VIEWS.map((v, i) => {
          const isActive = activeView === v.path;
          const isPhotos = v.path === "/photos";

          return (
            <Box key={v.path}>
              {i > 0 && <Box height="1px" bg="var(--theme-divider)" />}
              <HStack
                justify="space-between"
                align="center"
                py="min(4.5vmin, 20px)"
                cursor="pointer"
                onClick={() => changeView(v.path)}
                _active={{ opacity: 0.5 }}
              >
                <Text
                  fontSize="min(4.5vmin, 22px)"
                  fontWeight={isActive ? "400" : "300"}
                  color={isActive ? "var(--theme-fg)" : "var(--theme-fg-dim)"}
                  letterSpacing="0.01em"
                >
                  {v.label}
                </Text>
                <HStack gap="min(3vmin, 14px)" align="center">
                  {isActive && (
                    <Box
                      width="5px"
                      height="5px"
                      borderRadius="full"
                      bg="var(--theme-fg)"
                    />
                  )}
                  {isPhotos && (
                    <Box
                      as="button"
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
                      <MdSkipNext size={20} />
                    </Box>
                  )}
                </HStack>
              </HStack>
            </Box>
          );
        })}
      </VStack>

      {/* Display mode */}
      <Box mt="min(10vmin, 48px)">
        <HStack justify="space-between" align="baseline" mb="min(3vmin, 14px)">
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
                borderColor={isActive ? "var(--theme-fg-dim)" : "var(--theme-divider)"}
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
      <Box mt="min(10vmin, 48px)">
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
  );
}
