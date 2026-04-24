import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

/**
 * Capa de datos pura para el ordenamiento de tracks.
 * - Validación estricta con Zod (defensa contra IDs inválidos / payloads corruptos).
 * - Sin SQL string concat: todas las escrituras usan el query builder parametrizado.
 * - Paginación explícita para releases con muchos tracks (>1000).
 * - Funciones idempotentes: reintentar nunca corrompe el estado.
 */

const UuidSchema = z.string().uuid();
const TrackNumberSchema = z.number().int().min(1).max(999);

const ReorderInputSchema = z.object({
  releaseId: UuidSchema,
  orderedTrackIds: z.array(UuidSchema).min(1).max(500),
});

const PAGE_SIZE = 1000;

interface MinimalTrack {
  id: string;
  track_number: number;
  created_at: string;
}

/**
 * Carga todos los tracks de un release ordenados por (track_number, created_at).
 * Usa paginación para evitar el límite por defecto de Supabase.
 */
async function loadAllTracks(releaseId: string): Promise<MinimalTrack[]> {
  const all: MinimalTrack[] = [];
  let from = 0;
  // Bucle defensivo, máximo 10 páginas (10.000 tracks) para evitar loops infinitos.
  for (let page = 0; page < 10; page++) {
    const { data, error } = await supabase
      .from('tracks')
      .select('id, track_number, created_at')
      .eq('release_id', releaseId)
      .order('track_number', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as MinimalTrack[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

/**
 * Renumera los tracks de un release como 1..N consecutivos respetando el orden actual.
 * Solo escribe los que cambian. Idempotente.
 */
export async function renumberTracks(releaseIdRaw: string): Promise<void> {
  const releaseId = UuidSchema.parse(releaseIdRaw);
  const tracks = await loadAllTracks(releaseId);
  if (tracks.length === 0) return;

  const updates: Array<{ id: string; newNumber: number }> = [];
  tracks.forEach((t, idx) => {
    const desired = idx + 1;
    TrackNumberSchema.parse(desired); // sanity check
    if (t.track_number !== desired) {
      updates.push({ id: t.id, newNumber: desired });
    }
  });

  if (updates.length === 0) return;

  // Estrategia en dos fases para evitar colisiones si existe un índice único futuro
  // sobre (release_id, track_number): primero offseteamos a un rango temporal alto.
  const OFFSET = 10000;
  await Promise.all(
    updates.map((u) =>
      supabase
        .from('tracks')
        .update({ track_number: u.newNumber + OFFSET } as any)
        .eq('id', u.id)
        .eq('release_id', releaseId),
    ),
  );
  await Promise.all(
    updates.map((u) =>
      supabase
        .from('tracks')
        .update({ track_number: u.newNumber } as any)
        .eq('id', u.id)
        .eq('release_id', releaseId),
    ),
  );
}

/**
 * Reordena los tracks de un release según un array de IDs.
 * Asigna track_number = índice + 1 para cada uno.
 */
export async function reorderTracks(
  releaseIdRaw: string,
  orderedTrackIdsRaw: string[],
): Promise<void> {
  const { releaseId, orderedTrackIds } = ReorderInputSchema.parse({
    releaseId: releaseIdRaw,
    orderedTrackIds: orderedTrackIdsRaw,
  });

  // Verificar que todos los IDs pertenecen al release (seguridad + RLS doble check).
  const existing = await loadAllTracks(releaseId);
  const existingIds = new Set(existing.map((t) => t.id));
  for (const id of orderedTrackIds) {
    if (!existingIds.has(id)) {
      throw new Error(`Track ${id} no pertenece al release ${releaseId}`);
    }
  }

  const OFFSET = 10000;
  // Fase 1: offset para evitar conflictos.
  await Promise.all(
    orderedTrackIds.map((id, i) =>
      supabase
        .from('tracks')
        .update({ track_number: i + 1 + OFFSET } as any)
        .eq('id', id)
        .eq('release_id', releaseId),
    ),
  );
  // Fase 2: número final.
  await Promise.all(
    orderedTrackIds.map((id, i) =>
      supabase
        .from('tracks')
        .update({ track_number: i + 1 } as any)
        .eq('id', id)
        .eq('release_id', releaseId),
    ),
  );

  // Renumerar para absorber tracks que pudieran no estar en orderedTrackIds.
  await renumberTracks(releaseId);
}
