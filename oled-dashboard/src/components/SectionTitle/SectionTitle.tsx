import { Text } from "@chakra-ui/react";
import { Divider } from "../Divider";

export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <>
    <Divider mb="1vmin" />
    <Text
      fontSize="2.6vmin"
      color="var(--theme-fg-faint)"
      letterSpacing="0.14em"
      mb="1vmin"
    >
      {children}
    </Text>
  </>
);
