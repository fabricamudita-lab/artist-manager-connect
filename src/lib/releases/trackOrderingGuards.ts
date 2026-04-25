import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

/**
 * Capa de datos pura para detectar el impacto de renumerar / reordenar tracks.
 * - Validación Zod estricta del input.
 * - Solo lectura, queries parametrizadas (sin SQL concat).
 * - Paginación explícita para releases con muchos tracks o muchos contratos.
 * - Idempotente: dos llamadas seguidas devuelven el mismo resultado.
 *
 * Respeta RLS: el usuario solo cuenta los registros a los que ya tiene acceso,
 * lo que es coherente con el resto de su contexto en la app.
 */

const UuidSchema = z.string().uuid();
const PAGE_SIZE = 1000;

export type ReorderImpactRef = {
  type: 'contract' | 'license' | 'pitch';
  id: string;
  title: string;
  status?: string | null;
  trackId?: string | null;
};

export type ReorderImpact = {
  /** True si hay firmas que dependen del orden — UI debe bloquear la acción. */
  blocked: boolean;
  /** Contratos discográficos firmados ligados al release. */
  signedContracts: number;
  /** Licencias IP firmadas ligadas al release. */
  signedLicenses: number;
  /** Borradores de contrato/licencia aún sin firmar (no bloquean). */
  draftContracts: number;
  /** Pitches que apuntan a algún track del release. */
  pitches: number;
  /** El release está marcado como publicado. */
  publishedToDistro: boolean;
  /** Total de tracks evaluados. */
  trackCount: number;
  /** Detalle navegable para la UI (limitado a 50 entradas). */
  refs: ReorderImpactRef[];
};

const SIGNED_STATUSES = new Set(['signed', 'firmado', 'completed', 'completado']);

async function loadAllTrackIds(releaseId: string): Promise<string[]> {
  const ids: string[] = [];
  let from = 0;
  for (let page = 0; page < 10; page++) {
    const { data, error } = await supabase
      .from('tracks')
      .select('id')
      .eq('release_id', releaseId)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    ids.push(...data.map((t) => t.id as string));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return ids;
}

async function loadReleaseStatus(releaseId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('releases')
    .select('status')
    .eq('id', releaseId)
    .maybeSingle();
  if (error) throw error;
  return (data?.status as string | null) ?? null;
}

async function loadContractDrafts(releaseId: string) {
  const all: Array<{ id: string; title: string; status: string; draft_type: string }> = [];
  let from = 0;
  for (let page = 0; page < 10; page++) {
    const { data, error } = await supabase
      .from('contract_drafts')
      .select('id, title, status, draft_type')
      .eq('release_id', releaseId)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as any[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

async function loadPitches(releaseId: string, trackIds: string[]) {
  if (trackIds.length === 0) return [] as Array<{ id: string; name: string; track_id: string | null; pitch_status: string }>;
  const all: Array<{ id: string; name: string; track_id: string | null; pitch_status: string }> = [];
  let from = 0;
  for (let page = 0; page < 10; page++) {
    const { data, error } = await supabase
      .from('pitches')
      .select('id, name, track_id, pitch_status')
      .eq('release_id', releaseId)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as any[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  // Solo nos importan los pitches anclados a un track concreto del release.
  const trackSet = new Set(trackIds);
  return all.filter((p) => p.track_id && trackSet.has(p.track_id));
}

/**
 * Calcula el impacto de renumerar/reordenar los tracks de un release.
 * No modifica nada. Pensado para ser cacheado con React Query.
 */
export async function getReorderImpact(releaseIdRaw: string): Promise<ReorderImpact> {
  const releaseId = UuidSchema.parse(releaseIdRaw);

  const [trackIds, status, drafts] = await Promise.all([
    loadAllTrackIds(releaseId),
    loadReleaseStatus(releaseId),
    loadContractDrafts(releaseId),
  ]);
  const pitches = await loadPitches(releaseId, trackIds);

  let signedContracts = 0;
  let signedLicenses = 0;
  let draftContracts = 0;
  const refs: ReorderImpactRef[] = [];

  for (const d of drafts) {
    const isLicense = (d.draft_type || '').toLowerCase().includes('licen')
      || (d.draft_type || '').toLowerCase().includes('ip');
    const isSigned = SIGNED_STATUSES.has((d.status || '').toLowerCase());
    if (isSigned) {
      if (isLicense) signedLicenses += 1;
      else signedContracts += 1;
      refs.push({
        type: isLicense ? 'license' : 'contract',
        id: d.id,
        title: d.title || (isLicense ? 'Licencia IP' : 'Contrato'),
        status: d.status,
      });
    } else {
      draftContracts += 1;
    }
  }

  for (const p of pitches) {
    refs.push({
      type: 'pitch',
      id: p.id,
      title: p.name || 'Pitch',
      status: p.pitch_status,
      trackId: p.track_id,
    });
  }

  const publishedToDistro = (status || '').toLowerCase() === 'released';
  const blocked = signedContracts > 0 || signedLicenses > 0;

  return {
    blocked,
    signedContracts,
    signedLicenses,
    draftContracts,
    pitches: pitches.length,
    publishedToDistro,
    trackCount: trackIds.length,
    refs: refs.slice(0, 50),
  };
}
