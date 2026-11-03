import { useEffect } from "react";
import { socket } from "../lib/socket";

export function useReady() {
  useEffect(() => {
    function onReady() {
      window.location.reload();
    }
    socket.on("ready", onReady);
    return () => {
      socket.off("ready", onReady);
    };
  }, []);
}
