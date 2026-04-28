import { Text } from "@chakra-ui/react";

export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Text fontSize="2.2vmin" color="var(--theme-fg-dim)" letterSpacing="0.1em">
    {children}
  </Text>
);
