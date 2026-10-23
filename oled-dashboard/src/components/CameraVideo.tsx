import { useEffect, useRef } from "react";
import { chakra } from "@chakra-ui/react";
import type Hls from "hls.js";

// Give up on the live stream if it hasn't started playing by then.
const START_TIMEOUT_MS = 15_000;

/**
 * The configured camera's live video: Home Assistant's own HLS stream, started
 * through /api/camera/hls and played through the add-on's proxy.
 *
 * hls.js (loaded only when a stream is shown) plays it wherever Media Source
 * Extensions exist — Chrome, the frame's WebView, iOS 17.1+ — in low-latency
 * mode; otherwise the browser's own HLS. Muted and inline so it can autoplay.
 * Calls `onPlaying` once video is moving and `onFail` (once) if the stream
 * can't start, errors fatally, or hasn't played within START_TIMEOUT_MS.
 * Unmounting tears hls.js down, which stops the segment requests.
 */
export function CameraVideo({
  onPlaying,
  onFail,
}: {
  onPlaying: () => void;
  onFail: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  // The callbacks change identity on every render of the card; the effect
  // below runs once per mount and reads them from here.
  const callbacks = useRef({ onPlaying, onFail });
  useEffect(() => {
    callbacks.current = { onPlaying, onFail };
  });
  // The mount's once-only failure path, for the <video>'s own error event.
  const failRef = useRef<() => void>(() => {});

  useEffect(() => {
    let hls: Hls | null = null;
    let done = false;
    let playing = false;
    const fail = () => {
      if (done || playing) return;
      done = true;
      callbacks.current.onFail();
    };
    failRef.current = fail;
    const timer = window.setTimeout(fail, START_TIMEOUT_MS);

    (async () => {
      try {
        const res = await fetch("/api/camera/hls");
        if (!res.ok) throw new Error(`stream start: ${res.status}`);
        const { url } = (await res.json()) as { url: string };
        const video = ref.current;
        if (!video || done) return;

        video.addEventListener(
          "playing",
          () => {
            playing = true;
            window.clearTimeout(timer);
            callbacks.current.onPlaying();
          },
          { once: true },
        );

        const { default: HlsLib } = await import("hls.js");
        if (done) return;
        if (HlsLib.isSupported()) {
          hls = new HlsLib({ lowLatencyMode: true });
          hls.on(HlsLib.Events.ERROR, (_event, data) => {
            if (data.fatal) fail();
          });
          hls.loadSource(url);
          hls.attachMedia(video);
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = url;
        } else {
          throw new Error("no HLS playback in this browser");
        }
      } catch (err) {
        console.warn("[camera] live stream unavailable:", err);
        fail();
      }
    })();

    return () => {
      done = true;
      window.clearTimeout(timer);
      hls?.destroy();
    };
  }, []);

  return (
    <chakra.video
      ref={ref}
      muted
      autoPlay
      playsInline
      onError={() => failRef.current()}
      width="100%"
      height="100%"
      objectFit="cover"
      display="block"
    />
  );
}
