ALTER TABLE public.contract_drafts
  ADD COLUMN IF NOT EXISTS recording_type text NOT NULL DEFAULT 'single'
    CHECK (recording_type IN ('single','album','fullAlbum')),
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'es'
    CHECK (language IN ('es','en'));

CREATE INDEX IF NOT EXISTS idx_contract_drafts_recording_type ON public.contract_drafts(recording_type);
CREATE INDEX IF NOT EXISTS idx_contract_drafts_language       ON public.contract_drafts(language);
CREATE INDEX IF NOT EXISTS idx_contract_drafts_release_id     ON public.contract_drafts(release_id);
CREATE INDEX IF NOT EXISTS idx_contract_drafts_share_token    ON public.contract_drafts(share_token);