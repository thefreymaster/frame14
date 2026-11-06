import { useQuery } from "@tanstack/react-query";

/** One of the configured albums, named by Home Assistant's Immich (its id until it has). */
export interface ImmichAlbum {
  id: string;
  albumName: string;
}

async function fetchAlbums(): Promise<ImmichAlbum[]> {
  const res = await fetch("/api/photos/albums");
  if (!res.ok) throw new Error(`Albums fetch failed: ${res.status}`);
  return res.json() as Promise<ImmichAlbum[]>;
}

export function useImmichAlbums() {
  return useQuery({
    queryKey: ["immich", "albums"],
    queryFn: fetchAlbums,
    staleTime: 1000 * 60 * 10,
  });
}
