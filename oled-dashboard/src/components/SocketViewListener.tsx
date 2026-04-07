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
    socket.on("change_view", onChangeView);
    return () => {
      socket.off("change_view", onChangeView);
    };
  }, [navigate, location.pathname]);

  return null;
}
