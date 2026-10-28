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
// The Media page is off for now (0.109, see lib/navItems).
// import { Media } from "./routes/Media"; // media page
import { Timer } from "./routes/Timer";
import { Energy } from "./routes/Energy";
import { Marquee } from "./routes/Marquee";
import { Football } from "./routes/Football";
import { Printer } from "./routes/Printer";
import { Vacuum } from "./routes/Vacuum";

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Navigate to="/home" replace /> },
      { path: "/clock", element: <Clock /> },
      { path: "/blank", element: <Blank /> },
      { path: "/photos", element: <Photos /> },
      { path: "/album", element: <Album /> },
      { path: "/control", element: <Control /> },
      { path: "/home", element: <HomeOverview /> },
      { path: "/lights", element: <Lights /> },
      { path: "/climate", element: <Climate /> },
      { path: "/weather", element: <Weather /> },
      { path: "/calendar", element: <Calendar /> },
      // Radar became the Weather page's tab (0.80); its path still lands
      // there, for automations and bookmarks.
      {
        path: "/radar",
        element: <Navigate to="/weather?tab=radar" replace />,
      },
      { path: "/timer", element: <Timer /> },
      { path: "/energy", element: <Energy /> },
      // Solar and Power became the Energy page's tabs (0.75); their paths
      // still land there, for automations and bookmarks.
      { path: "/solar", element: <Navigate to="/energy" replace /> },
      {
        path: "/power",
        element: <Navigate to="/energy?tab=circuits" replace />,
      },
      { path: "/printer", element: <Printer /> },
      { path: "/vacuum", element: <Vacuum /> },
      { path: "/cameras", element: <Cameras /> },
      // { path: "/media", element: <Media /> }, // media page
      { path: "/marquee", element: <Marquee /> },
      { path: "/football", element: <Football /> },
    ],
  },
]);
