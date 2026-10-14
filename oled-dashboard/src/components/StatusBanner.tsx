import { HStack, Icon, Text } from "@chakra-ui/react";
import { MdWifi, MdWifiOff } from "react-icons/md";
import { useSocket } from "../hooks/useSocket";
import { useVersion } from "../hooks/useVersion";
import { ApplianceIndicators } from "./ApplianceIndicators";
import { Tooltip } from "./ui/tooltip";

/** The thin strip above /home: connection, running appliances, version. */
export function StatusBanner() {
  const { connected } = useSocket();
  const version = useVersion();
  const StatusIcon = connected ? MdWifi : MdWifiOff;

  return (
    <HStack
      zIndex={1000}
      borderBottomWidth="1px"
      px="5"
      py="1"
      gap="3"
      justify="flex-start"
    >
      <Tooltip content={connected ? "Connected" : "Disconnected"}>
        <Icon
          boxSize="3.5"
          color={connected ? "fg.success" : "fg.error"}
          flexShrink={0}
          aria-label={connected ? "Connected" : "Disconnected"}
        >
          <StatusIcon />
        </Icon>
      </Tooltip>
      <ApplianceIndicators />
      {version && (
        <Text textStyle="xs" color="fg.muted">
          v{version}
        </Text>
      )}
    </HStack>
  );
}
