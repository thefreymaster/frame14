import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { socket } from "../lib/socket";

// A remote's control pages stay put while views change on the frames: a pick
// in the photo grid sends every display to Photos.
const STAY_PUT = new Set(["/control", "/album"]);

export function SocketViewListener() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function onChangeView(view: string) {
      if (STAY_PUT.has(location.pathname)) return;
      void navigate(`/${view}`);
    }
    function onReload() {
      if (STAY_PUT.has(location.pathname)) return;
      window.location.reload();
    }
    socket.on("change_view", onChangeView);
    socket.on("reload", onReload);
    return () => {
      socket.off("change_view", onChangeView);
      socket.off("reload", onReload);
    };
  }, [navigate, location.pathname]);

  return null;
}
