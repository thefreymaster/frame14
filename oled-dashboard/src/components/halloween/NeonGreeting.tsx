import { Box } from "@chakra-ui/react";
import { NeonWord } from "./NeonWord";

/**
 * "Happy Halloween" in neon, two tubes one over the other, a little below
 * the middle in portrait (between the moon and the pumpkins) and dead
 * centre in landscape. One heading to a screen reader; the letters are
 * drawn one by one (NeonWord) and hidden from it.
 */
export function NeonGreeting() {
  return (
    <Box
      role="heading"
      aria-level={1}
      aria-label="Happy Halloween"
      position="absolute"
      left="50%"
      top={{ base: "52%", _landscape: "50%" }}
      transform="translate(-50%, -50%)"
      display="flex"
      flexDirection="column"
      alignItems="center"
      gap={{ base: "3vmin", _landscape: "1vmin" }}
      width="100%"
      px="4vw"
      textAlign="center"
      pointerEvents="none"
    >
      {/* The vw terms size the portrait frame's, the vh terms a landscape
          desktop's: Halloween at 19vw is 304px on the frame, four fifths of
          its width. */}
      <NeonWord word="Happy" size="min(12.5vw, 15vh)" from={1} sway />
      <NeonWord
        word="Halloween"
        size="min(19vw, 24vh)"
        from={0}
        flicker={4}
        delay="-2.5s"
      />
    </Box>
  );
}
