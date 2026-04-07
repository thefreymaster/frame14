import { useQuery } from "@tanstack/react-query";

interface PhotosConfig {
  defaultAlbumId: string | null;
}

async function fetchPhotosConfig(): Promise<PhotosConfig> {
  const res = await fetch("/api/photos/config");
  if (!res.ok) throw new Error(`Photos config fetch failed: ${res.status}`);
  return res.json() as Promise<PhotosConfig>;
}

export function usePhotosConfig() {
  return useQuery({
    queryKey: ["photos", "config"],
    queryFn: fetchPhotosConfig,
    staleTime: Infinity,
  });
}
