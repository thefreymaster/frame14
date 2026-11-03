import { Badge, HStack } from "@chakra-ui/react";
import { IoColorPaletteOutline } from "react-icons/io5";
import { useThemeMode } from "../hooks/useThemeMode";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { ThemeFields } from "./ThemeFields";

/**
 * /control's Appearance card, under Device (0.148.0, the user's ask: "we
 * should have a theme and colors selector for this device under device"):
 * this remote's own theme and colors, kept on it alone (lib/themeMode's
 * `local`), so a remote no longer changes the frames' look or takes theirs.
 * A remote's alone — a frame wears the frames' theme, the Display tab's — and
 * the badge says what Auto or Device gives here now.
 */
export function AppearanceBoard() {
  const { local, effectiveMode, setLocalPreference, setLocalPalette } =
    useThemeMode();
  return (
    <Board
      title={
        <HStack justify="space-between" width="100%">
          <SectionTitle icon={<IoColorPaletteOutline />}>
            Appearance
          </SectionTitle>
          {(local.preference === "auto" || local.preference === "device") && (
            <Badge>
              {local.preference} · {effectiveMode}
            </Badge>
          )}
        </HStack>
      }
    >
      <ThemeFields
        value={local}
        onPreference={setLocalPreference}
        onPalette={setLocalPalette}
        helper="This remote's own, kept on it. The frames' are under Display."
      />
    </Board>
  );
}
