import { Box } from "@chakra-ui/react";
import { useColorModeValue } from "./ui/color-mode";

export const Board = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) => {
  const bg = useColorModeValue("white", "black");
  const border = useColorModeValue("gray.100", "#ffffff2a");
  return (
    <Box
      minWidth="100%"
      backgroundColor={bg}
      border={`1px solid`}
      borderColor={border}
      px="4"
      py="2"
      onClick={onClick}
      cursor={onClick ? "pointer" : undefined}
      borderRadius="sm"
    >
      {children}
    </Box>
  );
};
