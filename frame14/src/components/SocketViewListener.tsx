import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { getDeviceMode } from "../lib/deviceMode";
import { pageOf } from "../lib/pagePath";
import { socket } from "../lib/socket";

export function SocketViewListener() {
  const navigate = useNavigate();
  const location = useLocation();

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
