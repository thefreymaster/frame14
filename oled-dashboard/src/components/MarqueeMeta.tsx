import { useEffect, useState } from "react";
import { Box, Text } from "@chakra-ui/react";
import { PixelShift } from "./PixelShift";
import {
  elapsedSeconds,
  formatDuration,
  mediaSubtitle,
  mediaTitle,
  progressPct,
  type PlexAttrs,
} from "../lib/plexMedia";

interface Props {
  attrs: PlexAttrs | undefined;
  state: string | undefined;
}

/** Sits clear of the floating eye button (44px tall, 16px inset) in both
 *  orientations — 5vmin alone leaves the readout under it in landscape. */
const METRICS_BOTTOM =
  "calc(max(5vmin, 72px) + env(safe-area-inset-bottom, 0px))";

/**
 * Title, subtitle and progress, laid over the poster.
 *
 * Wrapped in PixelShift: the poster changes with every title, but this text
 * sits in the same place for hours at a time.
 */
export function MarqueeMeta({ attrs, state }: Props) {
  const [now, setNow] = useState(() => Date.now());

  // Only tick while playing — a paused title's progress never moves.
  useEffect(() => {
    if (state !== "playing") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state]);

  const title = mediaTitle(attrs);
  const subtitle = mediaSubtitle(attrs);
  const pct = progressPct(attrs, state, now);
  const elapsed = elapsedSeconds(attrs, state, now);
  const duration = attrs?.media_duration;

  if (!title) return null;

  return (
    <PixelShift>
      <Box
        position="absolute"
        bottom={METRICS_BOTTOM}
        left="5vmin"
        right="5vmin"
        pointerEvents="none"
        textShadow="0 0.4vmin 2vmin rgba(0,0,0,0.9)"
      >
        <Text
          fontSize="5vmin"
          fontWeight="300"
          letterSpacing="-0.02em"
          lineHeight="1.1"
          color="rgba(255,255,255,0.95)"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
        >
          {title}
        </Text>

        {subtitle && (
          <Text
            mt="0.8vmin"
            fontSize="2.4vmin"
            fontWeight="400"
            letterSpacing="0.04em"
            color="rgba(255,255,255,0.6)"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {subtitle}
          </Text>
        )}

        {pct !== null && (
          <Box mt="2vmin">
            <Box
              height="0.4vmin"
              borderRadius="full"
              bg="rgba(255,255,255,0.2)"
              overflow="hidden"
            >
              <Box
                height="100%"
                width={`${pct}%`}
                borderRadius="full"
                bg="rgba(255,255,255,0.85)"
                transition="width 1s linear"
              />
            </Box>
            {elapsed != null && duration != null && (
              <Box
                mt="1vmin"
                display="flex"
                justifyContent="space-between"
                color="rgba(255,255,255,0.55)"
              >
                <Text className="display-numeral" fontSize="1.8vmin">
                  {formatDuration(elapsed)}
                </Text>
                <Text className="display-numeral" fontSize="1.8vmin">
                  −{formatDuration(duration - elapsed)}
                </Text>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </PixelShift>
  );
}
