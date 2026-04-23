import { useEffect, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Music, Pin, PinOff } from 'lucide-react';
import {
  CREDIT_CATEGORIES,
  getRoleCategory5,
  getRoleLabel,
  type CreditCategory,
} from '@/lib/creditRoles';

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

interface PersonGroup {
  name: string;
  roles: string[]; // raw role values, deduped, in insertion order
}

// Group credits: first by category, then by person within each category.
function groupCreditsByCategory(credits: SharedCredit[]) {
  const map = new Map<CreditCategory | 'otro', Map<string, PersonGroup>>();

  for (const c of credits) {
    const name = (c.name || '').trim();
    if (!name) continue;
    const role = (c.role || '').trim();
    const cat = (getRoleCategory5(role) ?? 'otro') as CreditCategory | 'otro';

    if (!map.has(cat)) map.set(cat, new Map());
    const people = map.get(cat)!;
    const key = name.toLowerCase();
    if (!people.has(key)) {
      people.set(key, { name, roles: [] });
    }
    const person = people.get(key)!;
    if (role && !person.roles.includes(role)) person.roles.push(role);
  }

  return map;
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

  const grouped = groupCreditsByCategory(credits);
  const hasLyrics = !!(lyrics && lyrics.trim());
  const hasCredits = credits.length > 0;

  // Order: use canonical category order, then "otro" at the end
  const orderedCategories: (CreditCategory | 'otro')[] = [
    ...CREDIT_CATEGORIES.map((c) => c.id),
    'otro',
  ];

  const categoryLabel = (cat: CreditCategory | 'otro') => {
    if (cat === 'otro') return 'Otros';
    return CREDIT_CATEGORIES.find((c) => c.id === cat)?.label ?? cat;
  };

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
              <div className="space-y-4">
                {orderedCategories.map((catKey) => {
                  const people = grouped.get(catKey);
                  if (!people || people.size === 0) return null;
                  const label = categoryLabel(catKey);
                  return (
                    <section
                      key={catKey}
                      className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden"
                    >
                      <header className="px-3 py-2 border-b border-zinc-800 bg-zinc-900/60">
                        <h4 className="text-[11px] uppercase tracking-wider font-medium text-zinc-300">
                          {label}
                        </h4>
                      </header>
                      <ul className="divide-y divide-zinc-800/70">
                        {Array.from(people.values()).map((p) => (
                          <li key={p.name} className="px-3 py-2.5">
                            <p className="text-sm font-medium text-white">{p.name}</p>
                            {p.roles.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {p.roles.map((r) => (
                                  <span
                                    key={r}
                                    className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 text-[11px] text-zinc-200"
                                  >
                                    {getRoleLabel(r)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
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
