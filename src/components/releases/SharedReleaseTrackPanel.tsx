import { useEffect, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Music, Pin, PinOff } from 'lucide-react';

export interface SharedCredit {
  id: string;
  role: string | null;
  name: string | null;
  sort_order: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackTitle: string;
  artistName?: string;
  coverUrl?: string | null;
  lyrics?: string | null;
  credits: SharedCredit[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

const CATEGORIES: { key: string; label: string; match: RegExp }[] = [
  { key: 'composition', label: 'Composición y Letra', match: /(compos|letr|lyric|author|songwrit)/i },
  { key: 'production', label: 'Producción', match: /(produc|beat)/i },
  { key: 'performance', label: 'Intérpretes', match: /(vocal|cant|voz|guitar|bass|bajo|drum|bater|piano|sax|trump|perform|featur|ft\.?|interpret)/i },
  { key: 'mixmaster', label: 'Mezcla y Master', match: /(mix|master|engineer|ingenier)/i },
];

function groupCredits(credits: SharedCredit[]) {
  const groups: Record<string, SharedCredit[]> = {
    composition: [], production: [], performance: [], mixmaster: [], other: [],
  };
  credits.forEach((c) => {
    const role = c.role || '';
    const cat = CATEGORIES.find((x) => x.match.test(role));
    groups[cat?.key ?? 'other'].push(c);
  });
  return groups;
}

export function SharedReleaseTrackPanel({
  open, onOpenChange, trackTitle, artistName, coverUrl,
  lyrics, credits, isPlaying, currentTime, duration,
}: Props) {
  const lyricsRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const userScrollingRef = useRef(false);
  const userScrollTimer = useRef<number | null>(null);

  // Auto-scroll proporcional al progreso
  useEffect(() => {
    if (!autoScroll || !isPlaying || !lyricsRef.current || !duration) return;
    const el = lyricsRef.current;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) return;
    const target = (currentTime / duration) * max;
    el.scrollTo({ top: target, behavior: 'smooth' });
  }, [currentTime, duration, isPlaying, autoScroll]);

  const handleUserScroll = () => {
    userScrollingRef.current = true;
    if (userScrollTimer.current) window.clearTimeout(userScrollTimer.current);
    userScrollTimer.current = window.setTimeout(() => {
      userScrollingRef.current = false;
    }, 1500);
  };

  const groups = groupCredits(credits);
  const hasLyrics = !!(lyrics && lyrics.trim());
  const hasCredits = credits.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-zinc-950 border-zinc-800 text-white w-full sm:max-w-md p-0 flex flex-col"
      >
        <SheetHeader className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded bg-zinc-800 overflow-hidden shrink-0">
              {coverUrl ? (
                <img src={coverUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="h-5 w-5 text-zinc-600" />
                </div>
              )}
            </div>
            <div className="min-w-0 text-left">
              <SheetTitle className="text-white text-base truncate">{trackTitle}</SheetTitle>
              {artistName && <p className="text-xs text-zinc-400 truncate">{artistName}</p>}
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue={hasLyrics ? 'lyrics' : 'credits'} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-3 bg-zinc-900 border border-zinc-800 grid grid-cols-2">
            <TabsTrigger value="lyrics" disabled={!hasLyrics} className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">
              Letra
            </TabsTrigger>
            <TabsTrigger value="credits" disabled={!hasCredits} className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">
              Créditos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lyrics" className="flex-1 min-h-0 mt-3 px-4 pb-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500">
                {autoScroll ? 'Auto-scroll activo' : 'Lectura libre'}
              </span>
              <Button
                variant="ghost" size="sm"
                onClick={() => setAutoScroll((v) => !v)}
                className="text-zinc-400 hover:text-white h-7 px-2"
              >
                {autoScroll ? <PinOff className="h-3.5 w-3.5 mr-1" /> : <Pin className="h-3.5 w-3.5 mr-1" />}
                {autoScroll ? 'Desactivar' : 'Seguir'}
              </Button>
            </div>
            <div
              ref={lyricsRef}
              onWheel={handleUserScroll}
              onTouchMove={handleUserScroll}
              className="flex-1 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-zinc-200 pr-2"
            >
              {hasLyrics ? lyrics : <span className="text-zinc-500">Sin letra disponible.</span>}
            </div>
          </TabsContent>

          <TabsContent value="credits" className="flex-1 min-h-0 mt-3 px-4 pb-4 overflow-y-auto">
            {hasCredits ? (
              <div className="space-y-5">
                {CATEGORIES.map((cat) => {
                  const items = groups[cat.key];
                  if (!items.length) return null;
                  return (
                    <div key={cat.key}>
                      <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">{cat.label}</h4>
                      <ul className="space-y-1.5">
                        {items.map((c) => (
                          <li key={c.id} className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="text-zinc-400 shrink-0">{c.role || '—'}</span>
                            <span className="text-white text-right truncate">{c.name || '—'}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
                {groups.other.length > 0 && (
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Otros</h4>
                    <ul className="space-y-1.5">
                      {groups.other.map((c) => (
                        <li key={c.id} className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="text-zinc-400 shrink-0">{c.role || '—'}</span>
                          <span className="text-white text-right truncate">{c.name || '—'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-zinc-500 text-sm">Sin créditos disponibles.</p>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
