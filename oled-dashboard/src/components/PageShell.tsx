import { Flex } from "@chakra-ui/react";

/**
 * The page every route sits on — the same gutter and card gap as /home, so a
 * page reads as part of the same app.
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
  return (
    <Flex
      // PageTransition keys off this to give a fill page a definite height
      // when the layout scrolls (every route on a remote-mode device).
      data-page-fill={fill ? "" : undefined}
      width="100%"
      minHeight="100%"
      height={fill ? "100%" : undefined}
      direction="column"
      align={center ? "center" : undefined}
      p="gutter"
      overflow={fill ? "hidden" : undefined}
    >
      <Flex
        direction="column"
        gap="gutter"
        width="100%"
        minW="0"
        minH="0"
        flex={fill ? "1" : undefined}
        maxW={maxW && { base: maxW.portrait, _landscape: maxW.landscape }}
      >
        {children}
      </Flex>
    </Flex>
  );
}
