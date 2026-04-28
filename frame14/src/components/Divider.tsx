import { Box } from "@chakra-ui/react";

interface Props {
  mb?: string;
}

export function Divider({ mb }: Props) {
  return (
    <Box
      width="100%"
      borderBottom="1px solid"
      borderColor="gray.200"
      _dark={{ borderColor: "gray.700" }}
      flexShrink={0}
      mb={mb}
    />
  );
}
