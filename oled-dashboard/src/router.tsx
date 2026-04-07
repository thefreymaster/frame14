import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { ClockWeather } from "./routes/ClockWeather";
import { Blank } from "./routes/Blank";
import { Photos } from "./routes/Photos";
import { Mobile } from "./routes/Mobile";
import { HomeOverview } from "./routes/HomeOverview";

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <Navigate to={/Mobi|Android/i.test(navigator.userAgent) ? "/control" : "/clock"} replace />,
      },
      { path: "/clock", element: <ClockWeather /> },
      { path: "/blank", element: <Blank /> },
      { path: "/photos", element: <Photos /> },
      { path: "/control", element: <Mobile /> },
      { path: "/home", element: <HomeOverview /> },
    ],
  },
]);
