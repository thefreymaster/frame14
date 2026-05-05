import { Box, HStack, Text } from "@chakra-ui/react";

export const SectionTitle = ({
  children,
  icon,
  iconColor,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  iconColor?: string;
}) => {
  if (!icon) {
    return (
      <Text fontSize="2.2vmin" color="var(--theme-fg-dim)" letterSpacing="0.1em">
        {children}
      </Text>
    );
  }
  return (
    <HStack gap="1vmin" align="center">
      <Box
        color={iconColor ?? "var(--theme-fg-dim)"}
        fontSize="2.4vmin"
        lineHeight="1"
        display="inline-flex"
      >
        {icon}
      </Box>
      <Text fontSize="2.2vmin" color="var(--theme-fg-dim)" letterSpacing="0.1em">
        {children}
      </Text>
    </HStack>
  );
};
