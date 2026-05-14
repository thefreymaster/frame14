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
  const border = useColorModeValue("gray.100", "#ffffff24");
  return (
    <Box
      minWidth="100%"
      backgroundColor={bg}
      border={`1px solid`}
      borderColor={border}
      pl="4"
      pr="4"
      pb="4"
      pt="2"
      onClick={onClick}
      cursor={onClick ? "pointer" : undefined}
      borderRadius="sm"
    >
      {children}
    </Box>
  );
};
