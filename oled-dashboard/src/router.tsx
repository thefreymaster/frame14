import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { Clock } from "./routes/Clock";
import { Blank } from "./routes/Blank";
import { Photos } from "./routes/Photos";
import { Control } from "./routes/Control";
import { HomeOverview } from "./routes/HomeOverview";
import { Lights } from "./routes/Lights";
import { Radar } from "./routes/Radar";
import { getDeviceMode } from "./lib/deviceMode";

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: "/",
        element: (
          <Navigate
            to={getDeviceMode() === "controller" ? "/control" : "/home"}
            replace
          />
        ),
      },
      { path: "/clock", element: <Clock /> },
      { path: "/blank", element: <Blank /> },
      { path: "/photos", element: <Photos /> },
      { path: "/control", element: <Control /> },
      { path: "/home", element: <HomeOverview /> },
      { path: "/lights", element: <Lights /> },
      { path: "/radar", element: <Radar /> },
    ],
  },
]);
