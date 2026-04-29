import { Box, HStack, Text } from "@chakra-ui/react";
import { MdWifi, MdWifiOff } from "react-icons/md";
import { useSocket } from "../hooks/useSocket";
import { useVersion } from "../hooks/useVersion";
import { ApplianceIndicators } from "./ApplianceIndicators";

export function StatusBanner() {
  const { connected } = useSocket();
  const version = useVersion();
  const iconColor = connected ? "#22c55e" : "#ef4444";
  const Icon = connected ? MdWifi : MdWifiOff;

  return (
    <Box
      zIndex={1000}
      bg="var(--theme-bg)"
      borderBottom="1px solid var(--theme-divider)"
      px={3}
      py="1"
      css={{
        "@media (orientation: landscape)": {
          left: "56px",
        },
      }}
    >
      <HStack gap={3} px="2" justify="flex-start">
        <Box as="span" display="inline-flex" color={iconColor} flexShrink={0}>
          <Icon size={12} />
        </Box>
        <ApplianceIndicators />
        {version && (
          <Text
            fontSize="10px"
            color="var(--theme-fg-muted)"
            letterSpacing="0.05em"
          >
            v{version}
          </Text>
        )}
      </HStack>
    </Box>
  );
}
