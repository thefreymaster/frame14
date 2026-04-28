import { Box, HStack, Text } from "@chakra-ui/react";
import { useSocket } from "../hooks/useSocket";
import { useVersion } from "../hooks/useVersion";
import { ApplianceIndicators } from "./ApplianceIndicators";

export function StatusBanner() {
  const { connected } = useSocket();
  const version = useVersion();
  const dotColor = connected ? "#22c55e" : "#ef4444";

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
      <HStack gap={3} px="6" justify="flex-start">
        {version && (
          <Text
            fontSize="10px"
            color="var(--theme-fg-muted)"
            letterSpacing="0.05em"
          >
            v{version}
          </Text>
        )}
        <HStack gap="5px">
          <Box
            as="span"
            display="inline-block"
            w="6px"
            h="6px"
            borderRadius="full"
            bg={dotColor}
            boxShadow={`0 0 4px ${dotColor}`}
            flexShrink={0}
          />
          <Text
            fontSize="10px"
            color="var(--theme-fg-muted)"
            letterSpacing="0.05em"
          >
            {connected ? "connected" : "disconnected"}
          </Text>
        </HStack>
        <ApplianceIndicators />
      </HStack>
    </Box>
  );
}
