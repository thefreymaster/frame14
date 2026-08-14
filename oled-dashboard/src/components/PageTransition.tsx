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
  /** Let the page grow past the viewport so the scroll container can reach its
   *  end — a fixed 100% height clips the tail of scrollable routes. */
  grow?: boolean;
}

export function PageTransition({ children, grow }: Props) {
  return (
    <Box
      animation={`${fadeScaleIn} 0.35s ease-out both`}
      width="100%"
      height={grow ? "auto" : "100%"}
      minHeight={grow ? "100%" : undefined}
    >
      {children}
    </Box>
  );
}
