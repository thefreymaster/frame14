import { Outlet, useLocation } from "react-router";
import { SocketViewListener } from "./SocketViewListener";
import { PageTransition } from "./PageTransition";
import { PixelShift } from "./PixelShift";

export function Layout() {
  const location = useLocation();
  const isControl = location.pathname === "/control";

  const content = (
    <PageTransition key={location.pathname}>
      <Outlet />
    </PageTransition>
  );

  return (
    <>
      <SocketViewListener />
      {isControl ? content : <PixelShift>{content}</PixelShift>}
    </>
  );
}
