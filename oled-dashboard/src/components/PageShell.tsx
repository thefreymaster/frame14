import { Flex } from "@chakra-ui/react";

/**
 * The page ground every route sits on — the same one the home bento uses.
 *
 * Cards handle their own padding, so the shell only owns the outer gutter and
 * the gap between tiles. Both are the `gutter` token, which is what makes a
 * page read as part of the same app as /home rather than a differently-padded
 * island.
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
      bg="bg"
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
