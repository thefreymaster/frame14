import { Box, Icon, Spinner } from "@chakra-ui/react";
import { IoAlert, IoCheckmark, IoMic, IoVolumeHigh } from "react-icons/io5";
import type { VoiceState } from "../lib/voiceAssist";
import { VoiceLevelRing } from "./VoiceLevelRing";

/** The orb's room: the level ring swells past the orb into it. */
const ROOM = "8rem";
const ORB = "5rem";

/**
 * The voice overlay's centrepiece (0.163.0): a solid orb in the app icon's
 * blue with a soft glow of its own colour, its glyph saying what the turn is
 * doing — the mic while it listens (the live level ring swelling behind it),
 * a thin arc spinning round it while the model thinks, a speaker while the
 * reply plays, a check in green when a tone answered, an alert in red when
 * the turn failed.
 */
export function VoiceOrb({ state }: { state: VoiceState }) {
  const palette =
    state === "done" ? "green" : state === "error" ? "red" : "brand";
  const glyph =
    state === "done" ? (
      <IoCheckmark />
    ) : state === "error" ? (
      <IoAlert />
    ) : state === "speaking" ? (
      <IoVolumeHigh />
    ) : (
      <IoMic />
    );
  const listening = state === "listening" || state === "transcribing";

  return (
    <Box
      position="relative"
      display="flex"
      alignItems="center"
      justifyContent="center"
      boxSize={ROOM}
      colorPalette={palette}
      data-voice-orb={state}
    >
      {listening && <VoiceLevelRing size={ROOM} />}
      {state === "thinking" && (
        <Spinner
          position="absolute"
          color="colorPalette.solid"
          borderWidth="2px"
          animationDuration="1.1s"
          css={{
            "--spinner-size": "6.5rem",
            "--spinner-track-color": "transparent",
          }}
          _motionReduce={{ animation: "none" }}
        />
      )}
      <Box
        position="relative"
        display="flex"
        alignItems="center"
        justifyContent="center"
        boxSize={ORB}
        rounded="full"
        bg="colorPalette.solid"
        color="colorPalette.contrast"
        boxShadow="0 0 2.5rem {colors.colorPalette.muted}"
      >
        <Icon boxSize="8">{glyph}</Icon>
      </Box>
    </Box>
  );
}
