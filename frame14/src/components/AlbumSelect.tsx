import { useQueryClient } from "@tanstack/react-query";
import { usePhotosConfig } from "../hooks/usePhotosConfig";
import { useImmichAlbums } from "../hooks/useImmichAlbums";
import { toaster } from "./ui/toaster";
import { NativeSelectField, NativeSelectRoot } from "./ui/native-select";

/**
 * The slideshow's album, every frame's: the options of HA's
 * input_select.smart_frame_album, named from Immich. On /control and the
 * remote's photo grid.
 */
export function AlbumSelect() {
  const queryClient = useQueryClient();
  const { data: photosConfig } = usePhotosConfig();
  const { data: albums } = useImmichAlbums();

  async function handleAlbumChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const option = e.target.value;
    if (!option) return;
    await fetch("/api/photos/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ option }),
    });
    queryClient.invalidateQueries({ queryKey: ["photos", "config"] });
    const name = albums?.find((a) => a.id === option)?.albumName ?? option;
    toaster.create({
      title: "Album changed",
      description: name,
      type: "success",
    });
  }

  return (
    <NativeSelectRoot>
      <NativeSelectField
        aria-label="Photo album"
        value={photosConfig?.defaultAlbumId ?? ""}
        onChange={handleAlbumChange}
      >
        {!photosConfig?.defaultAlbumId && <option value="">—</option>}
        {photosConfig?.options.map((id) => {
          const album = albums?.find((a) => a.id === id);
          return (
            <option key={id} value={id}>
              {album?.albumName ?? id}
            </option>
          );
        })}
      </NativeSelectField>
    </NativeSelectRoot>
  );
}
