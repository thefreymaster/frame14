import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { Clock } from "./routes/Clock";
import { DigitalClock } from "./routes/DigitalClock";
import { Blank } from "./routes/Blank";
import { Photos } from "./routes/Photos";
import { Control } from "./routes/Control";
import { HomeOverview } from "./routes/HomeOverview";

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: "/",
        element: (
          <Navigate
            to={
              /Mobi|Android/i.test(navigator.userAgent) ? "/control" : "/home"
            }
            replace
          />
        ),
      },
      { path: "/clock", element: <Clock /> },
      { path: "/digital", element: <DigitalClock /> },
      { path: "/blank", element: <Blank /> },
      { path: "/photos", element: <Photos /> },
      { path: "/control", element: <Control /> },
      { path: "/home", element: <HomeOverview /> },
    ],
  },
]);
