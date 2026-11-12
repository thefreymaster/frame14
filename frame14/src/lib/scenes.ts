/** What a scene, script or automation's state carries that a tile shows. */
export type SceneAttrs = { friendly_name?: string; icon?: string };

/**
 * Whether Home Assistant has this scene to run (0.165.0): it has a state,
 * and not "unavailable". "unknown" counts — a scene that has never been
 * turned on says that until one is.
 */
export const sceneAvailable = (state: string | undefined) =>
  state != null && state !== "" && state !== "unavailable";

/**
 * A scene's name as its tile shows it: Home Assistant's, else the id's words
 * ("scene.movie_night" is "Movie Night").
 */
export function sceneName(entityId: string, attrs?: SceneAttrs): string {
  const name = attrs?.friendly_name?.trim();
  if (name) return name;
  const words = (entityId.split(".")[1] ?? entityId).split("_").filter(Boolean);
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}
