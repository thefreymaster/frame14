import { useState, useEffect } from "react";
import { Box, Text, HStack, VStack } from "@chakra-ui/react";
import { MdSkipNext } from "react-icons/md";
import { useSocket } from "../hooks/useSocket";
import { socket } from "../lib/socket";

const VIEWS = [
  { path: "/home", label: "Overview" },
  { path: "/clock", label: "Analog Clock" },
  { path: "/digital", label: "Digital Clock" },
  { path: "/photos", label: "Photo Slideshow" },
  { path: "/blank", label: "Blank Screen" },
];

function nextPhoto() {
  socket.emit("next_photo");
}

export function Control() {
  const { connected } = useSocket();
  const [activeView, setActiveView] = useState<string | null>(null);

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
      width="100vw"
      minHeight="100vh"
      bg="#000"
      px="8vmin"
      py="12vmin"
      display="flex"
      flexDirection="column"
    >
      {/* Header */}
      <HStack justify="space-between" align="baseline" mb="8vmin">
        <Text
          fontSize="5vmin"
          color="gray.400"
          fontWeight="300"
          letterSpacing="0.02em"
        >
          Control
        </Text>
        <HStack gap="1.5vmin" align="center">
          <Box
            width="5px"
            height="5px"
            borderRadius="full"
            bg={connected ? "green.700" : "gray.800"}
          />
          <Text fontSize="3vmin" color="gray.700">
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
              {i > 0 && <Box height="1px" bg="gray.900" />}
              <HStack
                justify="space-between"
                align="center"
                py="4.5vmin"
                cursor="pointer"
                onClick={() => changeView(v.path)}
                _active={{ opacity: 0.5 }}
              >
                <Text
                  fontSize="4.5vmin"
                  fontWeight={isActive ? "400" : "300"}
                  color={isActive ? "white" : "gray.500"}
                  letterSpacing="0.01em"
                >
                  {v.label}
                </Text>
                <HStack gap="3vmin" align="center">
                  {isActive && (
                    <Box
                      width="5px"
                      height="5px"
                      borderRadius="full"
                      bg="white"
                    />
                  )}
                  {isPhotos && (
                    <Box
                      as="button"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        nextPhoto();
                      }}
                      color="gray.700"
                      _hover={{ color: "gray.400" }}
                      display="flex"
                      alignItems="center"
                      p="1vmin"
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
    </Box>
  );
}
