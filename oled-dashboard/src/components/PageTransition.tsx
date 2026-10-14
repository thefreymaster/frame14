import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Let the page grow past the viewport so the scroll container can reach its
   *  end — a fixed 100% height clips the tail of scrollable routes. */
  grow?: boolean;
}

/** Route mount animation: Chakra's own fade-in + scale-in. */
export function PageTransition({ children, grow }: Props) {
  return (
    <Box
      animationName="fade-in, scale-in"
      animationDuration="slow"
      width="100%"
      height={grow ? "auto" : "100%"}
      minHeight={grow ? "100%" : undefined}
      // Growing, a `PageShell fill` page resolves its 100% height against auto,
      // and whatever is sized by the space left over — the solar chart — gets
      // 0px. A one-row grid fixes that: the row stretches to the min-height (and
      // past it with content), and a grid area is a definite height to divide.
      // Scoped to fill pages because the row takes all the slack, which would
      // push down the second child of a page that renders two (/home does).
      css={
        grow
          ? {
              "&:has(> [data-page-fill])": {
                display: "grid",
                gridTemplateRows: "1fr",
                gridTemplateColumns: "minmax(0, 1fr)",
              },
            }
          : undefined
      }
    >
      {children}
    </Box>
  );
}
