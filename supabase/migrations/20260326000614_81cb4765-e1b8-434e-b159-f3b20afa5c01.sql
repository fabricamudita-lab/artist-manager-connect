create table public.track_artists (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references public.tracks(id) on delete cascade not null,
  artist_id uuid references public.artists(id) on delete cascade not null,
  role text not null default 'main',
  sort_order int not null default 0,
  created_at timestamptz default now(),
  unique (track_id, artist_id)
);

alter table public.track_artists enable row level security;

create policy "Users can manage track_artists" on public.track_artists
  for all using (true) with check (true);