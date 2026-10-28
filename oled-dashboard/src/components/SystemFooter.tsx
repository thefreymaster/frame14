import { Badge, HStack, Spacer } from "@chakra-ui/react";
import { useSocket } from "../hooks/useSocket";
import { useSystemInfo } from "../hooks/useSystemInfo";
import { RUNNING_VERSION } from "../lib/appVersion";
import { connectionLabel } from "../lib/connection";
import { FROST, NAV_SURFACE_TINT } from "../lib/floatingSurface";
import { FOOTER_HEIGHT, PAGE_GUTTER } from "../lib/navMetrics";
import { ArrangingVeil } from "./ArrangingVeil";
import { Status } from "./ui/status";

/**
 * The desktop's footer (since 0.102): a bar the header's height along the
 * bottom of the screen, on the header's frost, with the system in tags —
 * this Frame14's version (and the installed one, when the page is running an
 * older build), Home Assistant Core's version, Home Assistant OS's (left out
 * off HAOS) and, at the right, the connection: this page's socket to the
 * server, and the server's link to Home Assistant when that is down. Layout
 * renders it on a desktop only (`useDesktop`), with the nav, and pads the
 * page up by FOOTER_CLEARANCE; it comes and goes with the nav like the header,
 * and is veiled with it while /home is being arranged.
 */
export function SystemFooter({
  hidden = false,
  veiled = false,
}: {
  hidden?: boolean;
  /** /home is being arranged: blurred, dimmed and out of reach. */
  veiled?: boolean;
}) {
  const { status } = useSocket();
  const info = useSystemInfo(!hidden).data;
  const connected = status === "connected";
  const haDown = connected && info != null && !info.homeAssistant.connected;

  const version =
    info && info.version !== RUNNING_VERSION
      ? `Frame14 v${RUNNING_VERSION} · v${info.version} installed`
      : `Frame14 v${RUNNING_VERSION}`;
  const core = info?.homeAssistant.coreVersion;
  const os = info?.homeAssistant.osVersion;

  return (
    <HStack
      data-footer
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      height={FOOTER_HEIGHT}
      pl={`calc(env(safe-area-inset-left, 0px) + ${PAGE_GUTTER})`}
      pr={`calc(env(safe-area-inset-right, 0px) + ${PAGE_GUTTER})`}
      gap="2"
      bg={`bg/${NAV_SURFACE_TINT}`}
      {...FROST}
      zIndex="sticky"
      inert={veiled || undefined}
      transform={hidden ? "translateY(100%)" : "translateY(0)"}
      transition="transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
    >
      <Badge variant="surface" colorPalette="gray">
        {version}
      </Badge>
      {core && (
        <Badge variant="surface" colorPalette="gray">
          HA Core {core}
        </Badge>
      )}
      {os && (
        <Badge variant="surface" colorPalette="gray">
          HAOS {os}
        </Badge>
      )}
      <Spacer />
      <Badge
        variant="surface"
        colorPalette={
          haDown || status === "disconnected"
            ? "red"
            : status === "connecting"
              ? "gray"
              : "green"
        }
      >
        <Status
          value={
            haDown || status === "disconnected"
              ? "error"
              : status === "connecting"
                ? "warning"
                : "success"
          }
        />
        {haDown ? "Home Assistant disconnected" : connectionLabel(status)}
      </Badge>
      <ArrangingVeil shown={veiled} />
    </HStack>
  );
}
