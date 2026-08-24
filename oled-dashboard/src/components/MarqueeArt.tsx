import { Box } from "@chakra-ui/react";

interface Props {
  /** Poster URL, or null while nothing is playing. */
  src: string | null;
}

/**
 * The poster, filling the whole screen.
 *
 * `cover` crops a 2:3 poster hard on a landscape frame, which is the intent —
 * nothing but artwork, edge to edge.
 *
 * Positioned absolute rather than fixed on purpose — PageTransition leaves a
 * persistent `transform` on an ancestor, which would make `fixed` resolve
 * against that box instead of the viewport.
 */
export function MarqueeArt({ src }: Props) {
  if (!src) return null;

  return (
    <Box
      position="absolute"
      inset={0}
      backgroundImage={`url(${src})`}
      backgroundSize="cover"
      backgroundPosition="center"
      backgroundRepeat="no-repeat"
      style={{ animation: "marqueeArtIn 1s ease-out both" }}
    />
  );
}
