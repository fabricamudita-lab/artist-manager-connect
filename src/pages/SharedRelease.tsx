import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Play, Pause, SkipForward, SkipBack, Music, Disc3, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SharedReleaseTrackPanel, SharedCredit } from '@/components/releases/SharedReleaseTrackPanel';

interface SharedTrack {
  id: string;
  title: string;
  track_number: number;
  duration: number | null;
  file_url: string | null;
  lyrics: string | null;
}

export default function SharedRelease() {
  const { token } = useParams<{ token: string }>();
  const [release, setRelease] = useState<any>(null);
  const [artist, setArtist] = useState<any>(null);
  const [tracks, setTracks] = useState<SharedTrack[]>([]);
  const [creditsByTrack, setCreditsByTrack] = useState<Record<string, SharedCredit[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTrackIndex, setPanelTrackIndex] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!token) return;
    loadSharedRelease();
  }, [token]);

  const loadSharedRelease = async () => {
    try {
      // Fetch release by share_token
      const { data: rel, error: relErr } = await supabase
        .from('releases')
        .select('*')
        .eq('share_token', token)
        .eq('share_enabled', true)
        .single();

      if (relErr || !rel) {
        setError('Este enlace no es válido o ha expirado.');
        setLoading(false);
        return;
      }

      // Check expiration
      if (rel.share_expires_at && new Date(rel.share_expires_at) < new Date()) {
        setError('Este enlace ha expirado.');
        setLoading(false);
        return;
      }

      setRelease(rel);

      // Fetch artist
      if (rel.artist_id) {
        const { data: art } = await supabase
          .from('artists')
          .select('name, avatar_url')
          .eq('id', rel.artist_id)
          .single();
        if (art) setArtist(art);
      }

      // Fetch tracks with current version audio
      const { data: trackData } = await supabase
        .from('tracks')
        .select('id, title, track_number, duration, lyrics')
        .eq('release_id', rel.id)
        .order('track_number', { ascending: true });

      if (trackData && trackData.length > 0) {
        const trackIds = trackData.map(t => t.id);
        const [{ data: versions }, { data: creditsData }] = await Promise.all([
          supabase
            .from('track_versions')
            .select('track_id, file_url')
            .in('track_id', trackIds)
            .eq('is_current_version', true),
          supabase
            .from('track_credits')
            .select('id, track_id, role, name, sort_order')
            .in('track_id', trackIds)
            .order('sort_order', { ascending: true, nullsFirst: false }),
        ]);

        const versionMap = new Map(versions?.map(v => [v.track_id, v.file_url]) || []);

        setTracks(trackData.map(t => ({
          id: t.id,
          title: t.title,
          track_number: t.track_number,
          duration: t.duration,
          lyrics: t.lyrics ?? null,
          file_url: versionMap.get(t.id) || null,
        })));

        const grouped: Record<string, SharedCredit[]> = {};
        (creditsData || []).forEach((c: any) => {
          if (!grouped[c.track_id]) grouped[c.track_id] = [];
          grouped[c.track_id].push({
            id: c.id,
            role: c.role,
            name: c.name,
            sort_order: c.sort_order,
          });
        });
        setCreditsByTrack(grouped);
      }
    } catch {
      setError('Error al cargar el release.');
    } finally {
      setLoading(false);
    }
  };

  const playTrack = (index: number) => {
    const track = tracks[index];
    if (!track?.file_url) return;

    if (currentTrackIndex === index && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    if (currentTrackIndex === index && !isPlaying) {
      audioRef.current?.play();
      setIsPlaying(true);
      return;
    }

    setCurrentTrackIndex(index);
    setIsPlaying(true);
    setProgress(0);
    
    if (audioRef.current) {
      audioRef.current.src = track.file_url;
      audioRef.current.play();
    }
  };

  const playNext = () => {
    if (currentTrackIndex === null) return;
    const next = currentTrackIndex + 1;
    if (next < tracks.length && tracks[next]?.file_url) {
      playTrack(next);
    } else {
      setIsPlaying(false);
      setCurrentTrackIndex(null);
    }
  };

  const playPrev = () => {
    if (currentTrackIndex === null) return;
    const prev = currentTrackIndex - 1;
    if (prev >= 0 && tracks[prev]?.file_url) {
      playTrack(prev);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const { currentTime: ct, duration: d } = audioRef.current;
    setCurrentTime(ct);
    setDuration(d);
    setProgress(d > 0 ? (ct / d) * 100 : 0);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = ratio * duration;
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Disc3 className="h-12 w-12 text-white/50 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <Music className="h-16 w-16 mx-auto text-white/30" />
          <p className="text-lg text-white/70">{error}</p>
        </div>
      </div>
    );
  }

  const currentTrack = currentTrackIndex !== null ? tracks[currentTrackIndex] : null;
  const playableTracks = tracks.filter(t => t.file_url);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={playNext}
        onLoadedMetadata={handleTimeUpdate}
      />

      <div className="max-w-4xl mx-auto px-4 py-8 md:py-16">
        <div className="grid md:grid-cols-[320px_1fr] gap-8 md:gap-12">
          {/* Cover Art */}
          <div className="flex flex-col items-center md:items-start gap-6">
            <div className="w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 bg-zinc-800 flex-shrink-0">
              {release?.cover_image_url ? (
                <img
                  src={release.cover_image_url}
                  alt={release.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Disc3 className="h-24 w-24 text-zinc-600" />
                </div>
              )}
            </div>

            <div className="text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{release?.title}</h1>
              {artist && (
                <p className="text-lg text-zinc-400 mt-1">{artist.name}</p>
              )}
              <p className="text-sm text-zinc-500 mt-2">
                {tracks.length} {tracks.length === 1 ? 'canción' : 'canciones'}
                {playableTracks.length < tracks.length && (
                  <span> · {playableTracks.length} disponibles</span>
                )}
              </p>
            </div>

            {/* Play All button */}
            {playableTracks.length > 0 && (
              <Button
                onClick={() => {
                  const firstPlayable = tracks.findIndex(t => t.file_url);
                  if (firstPlayable >= 0) playTrack(firstPlayable);
                }}
                className="bg-white text-black hover:bg-zinc-200 rounded-full px-8 py-3 font-semibold text-base"
                size="lg"
              >
                <Play className="h-5 w-5 mr-2 fill-current" />
                Reproducir todo
              </Button>
            )}
          </div>

          {/* Tracklist */}
          <div className="space-y-1">
            {tracks.map((track, index) => {
              const isActive = currentTrackIndex === index;
              const hasAudio = !!track.file_url;

              return (
                <button
                  key={track.id}
                  onClick={() => hasAudio && playTrack(index)}
                  disabled={!hasAudio}
                  className={cn(
                    "w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all text-left group",
                    isActive
                      ? "bg-white/10 text-white"
                      : hasAudio
                        ? "hover:bg-white/5 text-zinc-300"
                        : "text-zinc-600 cursor-not-allowed"
                  )}
                >
                  <span className="w-8 text-center text-sm font-mono shrink-0">
                    {isActive && isPlaying ? (
                      <span className="flex items-center justify-center gap-[2px]">
                        <span className="w-[3px] h-3 bg-white rounded-full animate-pulse" />
                        <span className="w-[3px] h-4 bg-white rounded-full animate-pulse [animation-delay:150ms]" />
                        <span className="w-[3px] h-2 bg-white rounded-full animate-pulse [animation-delay:300ms]" />
                      </span>
                    ) : (
                      <span className="text-zinc-500 group-hover:hidden">{track.track_number}</span>
                    )}
                    {!isActive && hasAudio && (
                      <Play className="h-4 w-4 hidden group-hover:block mx-auto fill-current" />
                    )}
                  </span>

                  <span className="flex-1 truncate font-medium text-sm">
                    {track.title}
                  </span>

                  {track.duration && (
                    <span className="text-xs text-zinc-500 shrink-0">
                      {formatTime(track.duration)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Now Playing Bar */}
        {currentTrack && (
          <div className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-lg border-t border-zinc-800 px-4 py-3">
            <div className="max-w-4xl mx-auto">
              {/* Progress bar */}
              <div
                className="w-full h-1 bg-zinc-700 rounded-full cursor-pointer mb-3 group"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-white rounded-full transition-all relative group-hover:h-1.5"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded bg-zinc-800 overflow-hidden shrink-0">
                    {release?.cover_image_url ? (
                      <img src={release.cover_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="h-4 w-4 text-zinc-600" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{currentTrack.title}</p>
                    <p className="text-xs text-zinc-400 truncate">{artist?.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-zinc-400 hover:text-white h-8 w-8"
                    onClick={playPrev}
                    disabled={currentTrackIndex === 0}
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:text-white h-10 w-10"
                    onClick={() => playTrack(currentTrackIndex!)}
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-zinc-400 hover:text-white h-8 w-8"
                    onClick={playNext}
                    disabled={currentTrackIndex === tracks.length - 1}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>

                <div className="text-xs text-zinc-500 w-24 text-right shrink-0 hidden sm:block">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
