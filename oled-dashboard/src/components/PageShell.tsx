import { Box } from "@chakra-ui/react";
import { GRID_GAP } from "../lib/surfaces";

/**
 * The page ground every route sits on — the same one the home bento uses.
 *
 * Cards handle their own padding, so the shell only owns the outer gutter and
 * the gap between tiles. Both are GRID_GAP, which is what makes a page read as
 * part of the same app as /home rather than a differently-padded island.
 */
export function PageShell({
  children,
  fill = false,
  center = false,
  maxW,
}: {
  children: React.ReactNode;
  /** Fill the viewport instead of growing with content (pages that own a chart). */
  fill?: boolean;
  /** Centre the column horizontally — used with maxW on the remote-sized pages. */
  center?: boolean;
  maxW?: { portrait: string; landscape: string };
}) {
  const column = (
    <Box
      width="100%"
      minW="0"
      flex={fill ? "1" : undefined}
      minH="0"
      display="flex"
      flexDirection="column"
      gap={GRID_GAP}
      css={
        maxW && {
          maxWidth: maxW.portrait,
          "@media (orientation: landscape)": { maxWidth: maxW.landscape },
        }
      }
    >
      {children}
    </Box>
  );

  return (
    <Box
      width="100%"
      minHeight="100%"
      height={fill ? "100%" : undefined}
      bg="var(--theme-bg)"
      display="flex"
      flexDirection="column"
      alignItems={center ? "center" : undefined}
      padding={GRID_GAP}
      overflow={fill ? "hidden" : undefined}
    >
      {column}
    </Box>
  );
}
