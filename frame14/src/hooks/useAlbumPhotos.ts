import { useQuery } from "@tanstack/react-query";

export interface ImmichAsset {
  id: string;
  createdAt: string;
}

export interface AlbumDetail {
  id: string;
  albumName: string;
  assets: ImmichAsset[];
}

async function fetchAlbumPhotos(albumId: string): Promise<AlbumDetail> {
  const res = await fetch(`/api/photos/albums/${albumId}`);
  if (!res.ok) throw new Error(`Album fetch failed: ${res.status}`);
  return res.json() as Promise<AlbumDetail>;
}

export function useAlbumPhotos(albumId: string | null) {
  return useQuery({
    queryKey: ["immich", "album", albumId],
    queryFn: () => fetchAlbumPhotos(albumId!),
    enabled: albumId !== null,
    staleTime: 1000 * 60 * 10,
  });
}
