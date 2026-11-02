import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { arrivalPath, takeArrivalView } from "../lib/arrivalView";
import { getDeviceMode } from "../lib/deviceMode";
import { isHalloween } from "../lib/halloween";
import { pageOf } from "../lib/pagePath";
import { socket } from "../lib/socket";

/**
 * The frames' views from the server: `change_view` broadcasts (an
 * automation, kickoff, playback, kitchen motion, a remote's Views), and —
 * once, as the page first connects (1.0.0, lib/arrivalView) — the game,
 * movie or Halloween the frames are on, which a page that opened after the
 * broadcast would otherwise miss. A remote and /control stay put; `reload`
 * reloads a frame.
 */
export function SocketViewListener() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(
    () =>
      takeArrivalView((view) => {
        const to = arrivalPath(view, {
          remote: getDeviceMode() === "controller",
          page: pageOf(window.location.pathname),
          halloween: isHalloween(),
        });
        if (to) void navigate(to);
      }),
    [navigate],
  );

  // Settings stays put, whichever of its tabs is up (a sub-route, 0.138).
  const onControl = pageOf(location.pathname) === "/control";
  useEffect(() => {
    function onChangeView(view: string) {
      // View changes are the frames': a remote goes where its user takes it,
      // not where kitchen motion, kickoff, playback or another device sends
      // the frames.
      if (getDeviceMode() === "controller") return;
      if (onControl) return;
      void navigate(`/${view}`);
    }
    function onReload() {
      if (onControl) return;
      window.location.reload();
    }
    socket.on("change_view", onChangeView);
    socket.on("reload", onReload);
    return () => {
      socket.off("change_view", onChangeView);
      socket.off("reload", onReload);
    };
  }, [navigate, onControl]);

  return null;
}
