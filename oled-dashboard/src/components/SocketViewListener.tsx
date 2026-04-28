import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { socket } from "../lib/socket";

export function SocketViewListener() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function onChangeView(view: string) {
      if (location.pathname === "/control") return;
      void navigate(`/${view}`);
    }
    function onReload() {
      if (location.pathname === "/control") return;
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
