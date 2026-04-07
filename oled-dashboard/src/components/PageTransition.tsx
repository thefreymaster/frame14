import { keyframes } from "@emotion/react";
import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";

const fadeScaleIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.97);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

interface Props {
  children: ReactNode;
}

export function PageTransition({ children }: Props) {
  return (
    <Box
      animation={`${fadeScaleIn} 0.35s ease-out both`}
      width="100%"
      height="100%"
    >
      {children}
    </Box>
  );
}
