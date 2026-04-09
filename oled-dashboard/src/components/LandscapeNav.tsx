import { useState, useEffect } from "react";
import { Box, VStack } from "@chakra-ui/react";
import { useLocation, useNavigate } from "react-router";
import { MdHome, MdPin, MdPhoto } from "react-icons/md";
import { BsClockFill } from "react-icons/bs";
import { socket } from "../lib/socket";

const NAV_ITEMS = [
  { path: "/home", icon: MdHome },
  { path: "/clock", icon: BsClockFill },
  { path: "/digital", icon: MdPin },
  { path: "/photos", icon: MdPhoto },
];

export function LandscapeNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState(location.pathname);

  useEffect(() => {
    setActiveView(location.pathname);
  }, [location.pathname]);

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
    socket.emit("change", path.replace("/", ""));
    setActiveView(path);
  }

  return (
    <Box
      position="fixed"
      left={0}
      top={0}
      bottom={0}
      width="56px"
      bg="#000"
      borderRight="1px solid"
      borderColor="gray.900"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={100}
    >
      <VStack gap="6px">
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.path;
          const Icon = item.icon;
          return (
            <Box
              key={item.path}
              as="button"
              onClick={() => handleClick(item.path)}
              display="flex"
              alignItems="center"
              justifyContent="center"
              width="40px"
              height="40px"
              borderRadius="8px"
              bg={isActive ? "whiteAlpha.100" : "transparent"}
              color={isActive ? "white" : "gray.600"}
              _hover={{ color: "gray.400" }}
              _active={{ opacity: 0.5 }}
              transition="all 0.15s"
            >
              <Icon size={22} />
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
}
