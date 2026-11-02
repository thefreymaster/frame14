import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { HalloweenScene } from "../components/halloween/HalloweenScene";
import { NavEyeButton } from "../components/NavEyeButton";
import { useHalloween } from "../hooks/useHalloween";
import { getNavVisible, setNavVisibleLocal } from "../lib/navVisibility";

/**
 * Happy Halloween, the whole screen: the night sky, the moon, the greeting
 * in neon, the pumpkins, and a witch who flies through now and then
 * (components/halloween). Offered on Oct 30 and 31 only (lib/halloween) —
 * in the nav and on a remote's Views card — though the path works any day,
 * for an automation or a bookmark. Full-bleed like /marquee: the nav hides
 * on mount (this device only) and the eye brings it back. A frame still on
 * it when Nov 1 arrives goes Home.
 */
export function Halloween() {
  const navigate = useNavigate();
  const halloween = useHalloween();

  useEffect(() => {
    const previous = getNavVisible();
    setNavVisibleLocal(false);
    return () => setNavVisibleLocal(previous);
  }, []);

  // Home at midnight: on the turn from the day to the day after only, so a
  // visit on another day (an automation, a bookmark) stays put.
  const wasHalloween = useRef(halloween);
  useEffect(() => {
    if (wasHalloween.current && !halloween) {
      void navigate("/home", { replace: true });
    }
    wasHalloween.current = halloween;
  }, [halloween, navigate]);

  return (
    <>
      <HalloweenScene />
      <NavEyeButton />
    </>
  );
}
