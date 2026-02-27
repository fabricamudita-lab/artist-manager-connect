import { corsHeaders } from "../_shared/cors.ts";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

async function getSpotifyToken(): Promise<string> {
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("SPOTIFY_CREDENTIALS_MISSING");
  }

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify auth failed: ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: string;
  release_date: string;
  total_tracks: number;
  images: { url: string; width: number; height: number }[];
  external_urls: { spotify: string };
  artists: { id: string; name: string }[];
  album_group?: string;
}

interface SpotifyAlbumDetail {
  id: string;
  name: string;
  album_type: string;
  release_date: string;
  release_date_precision: string;
  total_tracks: number;
  images: { url: string; width: number; height: number }[];
  external_urls: { spotify: string };
  external_ids?: { upc?: string };
  label?: string;
  copyrights?: { text: string; type: string }[];
  genres?: string[];
  tracks: {
    items: SpotifyTrack[];
    next: string | null;
  };
  artists: { id: string; name: string }[];
}

interface SpotifyTrack {
  id: string;
  name: string;
  track_number: number;
  duration_ms: number;
  explicit: boolean;
  external_urls: { spotify: string };
  external_ids?: { isrc?: string };
  preview_url: string | null;
  popularity?: number;
  artists: { id: string; name: string }[];
}

async function fetchArtistAlbums(token: string, artistId: string): Promise<SpotifyAlbum[]> {
  const albums: SpotifyAlbum[] = [];
  let url: string | null =
    `${SPOTIFY_API_BASE}/artists/${artistId}/albums?include_groups=album,single,appears_on,compilation&limit=50&market=ES`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Spotify API error: ${res.status}`);
    const data = await res.json();
    albums.push(...data.items);
    url = data.next;
  }

  return albums;
}

async function fetchAlbumDetails(token: string, albumIds: string[]): Promise<SpotifyAlbumDetail[]> {
  const details: SpotifyAlbumDetail[] = [];
  // Spotify allows up to 20 albums per request
  for (let i = 0; i < albumIds.length; i += 20) {
    const batch = albumIds.slice(i, i + 20);
    const res = await fetch(
      `${SPOTIFY_API_BASE}/albums?ids=${batch.join(",")}&market=ES`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`Spotify API error: ${res.status}`);
    const data = await res.json();
    details.push(...data.albums);
  }
  return details;
}

async function fetchArtistInfo(token: string, artistId: string) {
  const res = await fetch(`${SPOTIFY_API_BASE}/artists/${artistId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Spotify API error: ${res.status}`);
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const spotifyArtistId = url.searchParams.get("artistId");

    if (action === "fetch" && spotifyArtistId) {
      const token = await getSpotifyToken();

      // Fetch artist info + albums in parallel
      const [artistInfo, albums] = await Promise.all([
        fetchArtistInfo(token, spotifyArtistId),
        fetchArtistAlbums(token, spotifyArtistId),
      ]);

      // Fetch details for all albums (tracks, UPC, label, etc.)
      const albumIds = albums.map((a) => a.id);
      const albumDetails = await fetchAlbumDetails(token, albumIds);

      // Map details by ID for quick lookup
      const detailsMap = new Map<string, SpotifyAlbumDetail>();
      albumDetails.forEach((d) => detailsMap.set(d.id, d));

      // Organize by type
      const organized = albums.map((album) => {
        const detail = detailsMap.get(album.id);
        const albumGroup = album.album_group || album.album_type;

        // Map type
        let type: string;
        if (albumGroup === "appears_on") type = "appears_on";
        else if (albumGroup === "compilation") type = "compilation";
        else if (album.album_type === "album") type = "album";
        else if (album.album_type === "single" && (detail?.total_tracks || album.total_tracks) > 3) type = "ep";
        else type = "single";

        return {
          spotify_id: album.id,
          title: album.name,
          type,
          release_date: detail?.release_date || album.release_date,
          release_date_precision: detail?.release_date_precision || "day",
          total_tracks: detail?.total_tracks || album.total_tracks,
          cover_image_url: (detail?.images || album.images)?.[0]?.url || null,
          spotify_url: album.external_urls.spotify,
          upc: detail?.external_ids?.upc || null,
          label: detail?.label || null,
          copyright: detail?.copyrights?.[0]?.text || null,
          genre: detail?.genres?.[0] || null,
          artists: (detail?.artists || album.artists).map((a) => ({
            id: a.id,
            name: a.name,
          })),
          tracks: detail?.tracks?.items?.map((t) => ({
            spotify_id: t.id,
            title: t.name,
            track_number: t.track_number,
            duration_seconds: Math.round(t.duration_ms / 1000),
            explicit: t.explicit,
            spotify_url: t.external_urls.spotify,
            isrc: t.external_ids?.isrc || null,
            preview_url: t.preview_url,
            popularity: t.popularity || null,
            artists: t.artists.map((a) => ({ id: a.id, name: a.name })),
          })) || [],
        };
      });

      return new Response(
        JSON.stringify({
          artist: {
            name: artistInfo.name,
            spotify_id: artistInfo.id,
            image_url: artistInfo.images?.[0]?.url || null,
            genres: artistInfo.genres || [],
            followers: artistInfo.followers?.total || 0,
          },
          releases: organized,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action or missing params" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "SPOTIFY_CREDENTIALS_MISSING" ? 503 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
