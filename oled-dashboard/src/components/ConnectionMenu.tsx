import { useEffect, useState } from "react";
import { useSocket } from "../hooks/useSocket";
import { useConnectionInfo } from "../hooks/useConnectionInfo";
import { RUNNING_VERSION } from "../lib/appVersion";
import {
  connectionLabel,
  useConnectionSince,
  type ConnectionStatus,
} from "../lib/connection";
import { fmtClock } from "../lib/format";
import { socket } from "../lib/socket";
import { ConnectionIcon } from "./ConnectionIcon";
import { HeaderMenu } from "./HeaderMenu";
import { DataListItem, DataListRoot } from "./ui/data-list";
import { Status } from "./ui/status";

// Grey while connecting — on load, and after a drop while socket.io
// retries — and red only once it has been down a minute (lib/connection).
const CONNECTION_COLOR: Record<ConnectionStatus, string> = {
  connected: "fg.success",
  connecting: "fg.muted",
  disconnected: "fg.error",
};

const TRANSPORT_NAMES: Record<string, string> = {
  websocket: "WebSocket",
  polling: "HTTP polling",
  webtransport: "WebTransport",
};

/**
 * The socket's round trip to the server in ms, measured every few seconds
 * while `active` (the menu is open and the socket is up): an `echo` the
 * server answers at once. Null until the first answer, or when a check times
 * out.
 */
function useLatency(active: boolean): number | null {
  const [latency, setLatency] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const measure = () => {
      const started = performance.now();
      socket.timeout(5_000).emit("echo", (err: Error | null) => {
        if (cancelled) return;
        setLatency(err ? null : performance.now() - started);
      });
    };
    measure();
    const id = setInterval(measure, 3_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [active]);
  return active ? latency : null;
}

/**
 * The header's connection icon (ConnectionIcon, coloured by the status) and
 * the small menu a tap opens: the status and since when (the connect or the
 * drop), the round trip to the server, the transport, this device's address
 * as the server sees it, the server's address, whether the server is
 * connected to Home Assistant, and the version. The server-side facts come
 * from /api/connection while the menu is open; the rest the page knows
 * itself, so the menu still says something while disconnected.
 */
export function ConnectionMenu() {
  const { status } = useSocket();
  const since = useConnectionSince();
  const [open, setOpen] = useState(false);
  const info = useConnectionInfo(open).data;
  const connected = status === "connected";
  const latency = useLatency(open && connected);
  const label = connectionLabel(status);

  const transportName = socket.io.engine?.transport?.name;
  const transport = connected
    ? (TRANSPORT_NAMES[transportName] ?? transportName ?? "—")
    : "—";

  // Where this page is loaded from, plus the add-on's own LAN address when
  // that's a different name (a domain through a tunnel, say).
  const pageHost = window.location.host;
  const lanAddress = info?.server.addresses.includes(window.location.hostname)
    ? null
    : info?.server.addresses[0];
  const server = lanAddress ? `${pageHost} · ${lanAddress}` : pageHost;

  const ha = info
    ? `${info.homeAssistant.connected ? "Connected" : "Disconnected"} · ${
        info.homeAssistant.host === "supervisor"
          ? "via Supervisor"
          : info.homeAssistant.host
      }`
    : "—";

  const version =
    info && info.server.version !== RUNNING_VERSION
      ? `v${RUNNING_VERSION} · v${info.server.version} installed`
      : `v${RUNNING_VERSION}`;

  return (
    <HeaderMenu
      icon={<ConnectionIcon status={status} />}
      label={label}
      color={CONNECTION_COLOR[status]}
      title="Connection"
      onOpenChange={setOpen}
    >
      <DataListRoot orientation="horizontal" size="sm" gap="1.5">
        <DataListItem
          label="Status"
          value={
            <Status
              value={connected ? "success" : "error"}
              // Grey while connecting, as the header's icon is.
              colorPalette={status === "connecting" ? "gray" : undefined}
            >
              {label}
            </Status>
          }
        />
        <DataListItem label="Since" value={fmtClock(new Date(since))} />
        <DataListItem
          label="Round trip"
          value={latency == null ? "—" : `${Math.round(latency)} ms`}
        />
        <DataListItem label="Transport" value={transport} />
        <DataListItem
          label="This device"
          value={info?.client.address ?? "—"}
        />
        <DataListItem label="Server" value={server} />
        <DataListItem label="Home Assistant" value={ha} />
        <DataListItem label="Version" value={version} />
      </DataListRoot>
    </HeaderMenu>
  );
}
