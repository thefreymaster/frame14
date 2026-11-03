import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { Clock } from "./routes/Clock";
import { Blank } from "./routes/Blank";
import { Photos } from "./routes/Photos";
import { Album } from "./routes/Album";
import { Control } from "./routes/Control";
import { HomeOverview } from "./routes/HomeOverview";
import { Lights } from "./routes/Lights";
import { Climate } from "./routes/Climate";
import { Weather } from "./routes/Weather";
import { Calendar } from "./routes/Calendar";
import { Cameras } from "./routes/Cameras";
import { Timer } from "./routes/Timer";
import { Energy } from "./routes/Energy";
import { Marquee } from "./routes/Marquee";
import { Football } from "./routes/Football";
import { Printer } from "./routes/Printer";
import { Vacuum } from "./routes/Vacuum";
import { Unraid } from "./routes/Unraid";
import { Halloween } from "./routes/Halloween";

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Navigate to="/home" replace /> },
      { path: "/clock", element: <Clock /> },
      { path: "/blank", element: <Blank /> },
      { path: "/photos", element: <Photos /> },
      { path: "/album", element: <Album /> },
      // A page's tabs are its sub-routes (0.138): /control/display on a
      // phone, /weather/radar, /energy/circuits. The page alone lands on its
      // first tab where it has tabs; the old `?tab=` is taken to its tab.
      { path: "/control/:tab?", element: <Control /> },
      { path: "/home", element: <HomeOverview /> },
      { path: "/lights", element: <Lights /> },
      { path: "/climate", element: <Climate /> },
      { path: "/weather/:tab?", element: <Weather /> },
      { path: "/calendar", element: <Calendar /> },
      // Radar became the Weather page's tab (0.80); its path still lands
      // there, for automations and bookmarks.
      { path: "/radar", element: <Navigate to="/weather/radar" replace /> },
      { path: "/timer", element: <Timer /> },
      { path: "/energy/:tab?", element: <Energy /> },
      // Solar and Power became the Energy page's tabs (0.75); their paths
      // still land there, for automations and bookmarks.
      { path: "/solar", element: <Navigate to="/energy/solar" replace /> },
      { path: "/power", element: <Navigate to="/energy/circuits" replace /> },
      { path: "/printer", element: <Printer /> },
      { path: "/vacuum", element: <Vacuum /> },
      { path: "/cameras", element: <Cameras /> },
      { path: "/unraid", element: <Unraid /> },
      { path: "/marquee", element: <Marquee /> },
      { path: "/football", element: <Football /> },
      // Offered on Oct 30 and 31 (lib/halloween); routed all year, for an
      // automation or a bookmark.
      { path: "/halloween", element: <Halloween /> },
    ],
  },
]);
