import { Box, type BoxProps } from "@chakra-ui/react";

/**
 * A Material Design Icons glyph by name (0.139), as Home Assistant names an
 * entity's icon ("ceiling-light" of "mdi:ceiling-light"): the add-on serves
 * the SVG (GET /api/icon/:name, from @mdi/svg on the server — the whole set
 * is far too big for the bundle), and it is drawn as a mask over
 * `currentColor`, so it takes the colour of the text around it, as a
 * react-icons glyph does.
 */
export function MdiIcon({ name, ...rest }: { name: string } & BoxProps) {
  const url = `url(/api/icon/${encodeURIComponent(name)})`;
  return (
    <Box
      as="span"
      display="inline-block"
      flexShrink={0}
      bg="currentColor"
      data-mdi-icon={name}
      aria-hidden
      css={{
        maskImage: url,
        maskRepeat: "no-repeat",
        maskPosition: "center",
        maskSize: "contain",
        WebkitMaskImage: url,
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        WebkitMaskSize: "contain",
      }}
      {...rest}
    />
  );
}
