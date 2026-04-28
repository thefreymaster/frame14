import { type ReactNode } from "react";
import { Button, type ButtonProps } from "@chakra-ui/react";

interface Props extends Omit<ButtonProps, "onClick" | "children"> {
  label: ReactNode;
  onClick: () => void;
  active?: boolean;
}

export function ViewButton({ label, onClick, active = false, ...rest }: Props) {
  return (
    <Button
      onClick={onClick}
      size="lg"
      width="full"
      variant={active ? "solid" : "outline"}
      colorScheme="gray"
      bg={active ? "gray.700" : "transparent"}
      borderColor="gray.600"
      color={active ? "white" : "gray.300"}
      _hover={{ bg: "gray.700", color: "white" }}
      letterSpacing="0.05em"
      height="60px"
      fontSize="lg"
      borderRadius="md"
      {...rest}
    >
      {label}
    </Button>
  );
}
