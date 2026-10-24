import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { Clock } from "./routes/Clock";
import { Blank } from "./routes/Blank";
import { Photos } from "./routes/Photos";
import { Album } from "./routes/Album";
import { Control } from "./routes/Control";
import { HomeOverview } from "./routes/HomeOverview";
import { Lights } from "./routes/Lights";
import { Radar } from "./routes/Radar";
import { Timer } from "./routes/Timer";
import { Solar } from "./routes/Solar";
import { Power } from "./routes/Power";
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
      { path: "/radar", element: <Radar /> },
      { path: "/timer", element: <Timer /> },
      { path: "/solar", element: <Solar /> },
      { path: "/power", element: <Power /> },
      { path: "/printer", element: <Printer /> },
      { path: "/vacuum", element: <Vacuum /> },
      { path: "/marquee", element: <Marquee /> },
      { path: "/football", element: <Football /> },
    ],
  },
]);
