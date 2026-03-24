-- Add ON DELETE CASCADE to all foreign keys referencing artists.id that don't have it

-- booking_offers
ALTER TABLE public.booking_offers DROP CONSTRAINT booking_offers_artist_id_fkey;
ALTER TABLE public.booking_offers ADD CONSTRAINT booking_offers_artist_id_fkey
  FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE CASCADE;

-- budgets
ALTER TABLE public.budgets DROP CONSTRAINT budgets_artist_id_fkey;
ALTER TABLE public.budgets ADD CONSTRAINT budgets_artist_id_fkey
  FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE CASCADE;

-- irpf_retentions
ALTER TABLE public.irpf_retentions DROP CONSTRAINT irpf_retentions_artist_id_fkey;
ALTER TABLE public.irpf_retentions ADD CONSTRAINT irpf_retentions_artist_id_fkey
  FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE CASCADE;

-- liquidaciones
ALTER TABLE public.liquidaciones DROP CONSTRAINT liquidaciones_artist_id_fkey;
ALTER TABLE public.liquidaciones ADD CONSTRAINT liquidaciones_artist_id_fkey
  FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE CASCADE;

-- projects
ALTER TABLE public.projects DROP CONSTRAINT projects_artist_id_fkey;
ALTER TABLE public.projects ADD CONSTRAINT projects_artist_id_fkey
  FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE CASCADE;

-- quick_expenses
ALTER TABLE public.quick_expenses DROP CONSTRAINT quick_expenses_artist_id_fkey;
ALTER TABLE public.quick_expenses ADD CONSTRAINT quick_expenses_artist_id_fkey
  FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE CASCADE;

-- releases
ALTER TABLE public.releases DROP CONSTRAINT releases_artist_id_fkey;
ALTER TABLE public.releases ADD CONSTRAINT releases_artist_id_fkey
  FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE CASCADE;

-- solicitudes
ALTER TABLE public.solicitudes DROP CONSTRAINT solicitudes_artist_id_fkey;
ALTER TABLE public.solicitudes ADD CONSTRAINT solicitudes_artist_id_fkey
  FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE CASCADE;

-- sync_offers (artist_id)
ALTER TABLE public.sync_offers DROP CONSTRAINT sync_offers_artist_id_fkey;
ALTER TABLE public.sync_offers ADD CONSTRAINT sync_offers_artist_id_fkey
  FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE CASCADE;

-- sync_offers (suggested_artist_id)
ALTER TABLE public.sync_offers DROP CONSTRAINT sync_offers_suggested_artist_id_fkey;
ALTER TABLE public.sync_offers ADD CONSTRAINT sync_offers_suggested_artist_id_fkey
  FOREIGN KEY (suggested_artist_id) REFERENCES public.artists(id) ON DELETE SET NULL;

-- tour_roadmaps
ALTER TABLE public.tour_roadmaps DROP CONSTRAINT tour_roadmaps_artist_id_fkey;
ALTER TABLE public.tour_roadmaps ADD CONSTRAINT tour_roadmaps_artist_id_fkey
  FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE CASCADE;

-- track_credits
ALTER TABLE public.track_credits DROP CONSTRAINT track_credits_artist_id_fkey;
ALTER TABLE public.track_credits ADD CONSTRAINT track_credits_artist_id_fkey
  FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE CASCADE;