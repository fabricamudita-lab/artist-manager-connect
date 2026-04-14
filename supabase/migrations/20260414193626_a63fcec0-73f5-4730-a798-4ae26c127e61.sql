-- Main drafts table (using text for status/type to avoid enum issues)
create table public.contract_drafts (
  id uuid primary key default gen_random_uuid(),
  draft_type text not null default 'ip_license',
  status text not null default 'borrador',
  title text not null,
  form_data jsonb not null,
  clauses_data jsonb,
  share_token text unique default encode(gen_random_bytes(24), 'hex'),
  created_by uuid references auth.users(id) not null,
  release_id uuid references releases(id) on delete set null,
  booking_id uuid references booking_offers(id) on delete set null,
  artist_id uuid references artists(id) on delete set null,
  signed_pdf_url text,
  firma_fecha text,
  firma_lugar text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.contract_drafts enable row level security;

create policy "Owner full access" on public.contract_drafts
  for all to authenticated
  using (created_by = auth.uid());

create policy "Public read via token" on public.contract_drafts
  for select to anon
  using (share_token is not null);

-- Comments table
create table public.contract_draft_comments (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid references contract_drafts(id) on delete cascade not null,
  section_key text not null,
  message text not null,
  author_name text not null,
  author_profile_id uuid references profiles(id),
  parent_comment_id uuid references contract_draft_comments(id) on delete cascade,
  resolved boolean default false,
  created_at timestamptz default now()
);

alter table public.contract_draft_comments enable row level security;

create policy "Auth full access" on public.contract_draft_comments
  for all to authenticated using (true);
create policy "Anon read" on public.contract_draft_comments
  for select to anon using (true);
create policy "Anon insert" on public.contract_draft_comments
  for insert to anon with check (true);

-- Trigger for updated_at
create or replace function public.update_contract_drafts_updated_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_contract_drafts_updated_at
  before update on public.contract_drafts
  for each row execute function update_contract_drafts_updated_at();

-- Enable realtime
alter publication supabase_realtime add table contract_drafts;
alter publication supabase_realtime add table contract_draft_comments;