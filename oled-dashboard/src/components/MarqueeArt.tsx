import { Box } from "@chakra-ui/react";

interface Props {
  /** Poster URL, or null while nothing is playing. */
  src: string | null;
}

/**
 * Full-bleed poster art: the same image blurred to fill the screen, with the
 * real poster contained on top so a 2:3 movie poster is never cropped.
 *
 * Positioned absolute rather than fixed on purpose — PageTransition leaves a
 * persistent `transform` on an ancestor, which would make `fixed` resolve
 * against that box instead of the viewport.
 */
export function MarqueeArt({ src }: Props) {
  if (!src) return null;

  return (
    <Box position="absolute" inset={0} overflow="hidden">
      <Box
        position="absolute"
        inset={0}
        backgroundImage={`url(${src})`}
        backgroundSize="cover"
        backgroundPosition="center"
        backgroundRepeat="no-repeat"
        filter="blur(40px) brightness(0.4) saturate(1.2)"
        transform="scale(1.15)"
      />
      <Box
        position="absolute"
        top="6vmin"
        left="6vmin"
        right="6vmin"
        bottom="22vmin"
        backgroundImage={`url(${src})`}
        backgroundSize="contain"
        backgroundPosition="center"
        backgroundRepeat="no-repeat"
        style={{ animation: "marqueeArtIn 1s ease-out both" }}
      />
    </Box>
  );
}
