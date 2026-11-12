import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MdAutoAwesome, MdOutlinePlayCircle } from "react-icons/md";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HAState } from "../../src/hooks/useEntity";
import type { SceneAttrs } from "../../src/lib/scenes";
import { renderWithProviders } from "./helpers/render";

// The scene's state as useEntity would hand it over, the call that runs it
// and the toaster.
const live = vi.hoisted(() => ({
  state: undefined as HAState<SceneAttrs> | undefined,
  runScene: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("../../src/hooks/useEntity", () => ({
  useEntity: () => ({ data: live.state }),
}));
vi.mock("../../src/lib/callService", () => ({ runScene: live.runScene }));
vi.mock("../../src/components/ui/toaster", () => ({
  toaster: { create: live.toast },
}));

import { DONE_MS, SceneTile } from "../../src/components/SceneTile";

const MOVIE = "automation.new_automation_3";

const scene = (state: string, attributes: SceneAttrs = {}): HAState<SceneAttrs> => ({
  entity_id: MOVIE,
  state,
  attributes: { friendly_name: "Living Room Movie Mode", ...attributes },
  last_changed: "",
  last_updated: "",
});

const tile = () => screen.getByRole("button", { name: "Run Living Room Movie Mode" });
/** What a react-icons glyph draws: its paths. */
const drawn = (glyph: React.ReactElement) => render(glyph).container.querySelector("svg")!.innerHTML;
const phase = () => tile().getAttribute("data-scene-phase");

beforeEach(() => {
  live.state = scene("on");
  live.runScene.mockReset();
  live.toast.mockReset();
  live.runScene.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("SceneTile", () => {
  it("shows the name Home Assistant gives it, as a button that runs it", () => {
    renderWithProviders(<SceneTile entityId={MOVIE} />);
    expect(tile()).toHaveTextContent("Living Room Movie Mode");
    expect(tile()).toHaveAttribute("data-scene-entry");
    expect(phase()).toBe("idle");
    expect(tile()).toHaveAttribute("aria-busy", "false");
  });

  it("shows Home Assistant's icon when it has one, a play button when not — never the sparkles (0.165.1)", () => {
    const { unmount } = renderWithProviders(<SceneTile entityId={MOVIE} />);
    expect(tile().querySelector("[data-mdi-icon]")).toBeNull();
    const glyph = tile().querySelector("svg")!.innerHTML;
    expect(glyph).toBe(drawn(<MdOutlinePlayCircle />));
    expect(glyph).not.toBe(drawn(<MdAutoAwesome />));
    unmount();
    live.state = scene("on", { icon: "mdi:movie-open" });
    renderWithProviders(<SceneTile entityId={MOVIE} />);
    expect(tile().querySelector("[data-mdi-icon]")).toHaveAttribute("data-mdi-icon", "movie-open");
  });

  it("a tap runs it: busy until the server answers, then a tick for a moment", async () => {
    let answer: (r: { ok: boolean }) => void = () => {};
    live.runScene.mockReturnValue(new Promise((r) => (answer = r)));
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<SceneTile entityId={MOVIE} />);

    await user.click(tile());
    expect(live.runScene).toHaveBeenCalledExactlyOnceWith(MOVIE);
    expect(phase()).toBe("running");
    expect(tile()).toHaveAttribute("aria-busy", "true");

    // A second tap while it runs doesn't run it again.
    await user.click(tile());
    expect(live.runScene).toHaveBeenCalledTimes(1);

    await act(async () => answer({ ok: true }));
    expect(phase()).toBe("done");
    expect(tile()).toHaveAttribute("aria-busy", "false");
    expect(live.toast).not.toHaveBeenCalled();

    act(() => void vi.advanceTimersByTime(DONE_MS - 1));
    expect(phase()).toBe("done");
    act(() => void vi.advanceTimersByTime(1));
    expect(phase()).toBe("idle");

    // And it can be run again.
    live.runScene.mockResolvedValue({ ok: true });
    await user.click(tile());
    expect(live.runScene).toHaveBeenCalledTimes(2);
  });

  it("says so, with Home Assistant's words, when it doesn't run", async () => {
    live.runScene.mockResolvedValue({ ok: false, error: "Automation is disabled" });
    renderWithProviders(<SceneTile entityId={MOVIE} />);
    await userEvent.click(tile());
    await waitFor(() =>
      expect(live.toast).toHaveBeenCalledWith({
        type: "error",
        title: "Couldn't run Living Room Movie Mode",
        description: "Automation is disabled",
      }),
    );
    expect(phase()).toBe("idle");
  });

  it("isn't there for one Home Assistant doesn't have or can't reach, but is for a scene never turned on", () => {
    live.state = undefined;
    const none = renderWithProviders(<SceneTile entityId={MOVIE} />);
    expect(screen.queryByRole("button")).toBeNull();
    none.unmount();
    live.state = scene("unavailable");
    const gone = renderWithProviders(<SceneTile entityId={MOVIE} />);
    expect(screen.queryByRole("button")).toBeNull();
    gone.unmount();
    live.state = scene("unknown");
    renderWithProviders(<SceneTile entityId={MOVIE} />);
    expect(tile()).toBeInTheDocument();
  });

  it("names itself from its id when Home Assistant gives no name", () => {
    live.state = { ...scene("unknown"), entity_id: "scene.movie_night", attributes: {} };
    renderWithProviders(<SceneTile entityId="scene.movie_night" />);
    expect(screen.getByRole("button", { name: "Run Movie Night" })).toBeInTheDocument();
  });
});
