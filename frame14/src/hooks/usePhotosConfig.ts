import { useQuery } from "@tanstack/react-query";

interface PhotosConfig {
  defaultAlbumId: string | null;
  options: string[];
}

async function fetchPhotosConfig(): Promise<PhotosConfig> {
  const res = await fetch("/api/photos/config");
  if (!res.ok) throw new Error(`Photos config fetch failed: ${res.status}`);
  const data = (await res.json()) as Partial<PhotosConfig>;
  return {
    defaultAlbumId: data.defaultAlbumId ?? null,
    options: Array.isArray(data.options) ? data.options : [],
  };
}

export function usePhotosConfig() {
  return useQuery({
    queryKey: ["photos", "config"],
    queryFn: fetchPhotosConfig,
    staleTime: 1000 * 60,
  });
}
