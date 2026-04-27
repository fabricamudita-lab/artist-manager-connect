import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

/**
 * Capa de datos para presupuestos vinculados a un booking.
 * - Lógica separada de la UI: el componente solo consume estas funciones.
 * - Validación estricta con Zod (UUIDs, longitudes).
 * - Sin SQL string concat: query builder parametrizado.
 * - Paginación explícita.
 * - Errores tipados para que la UI pueda traducirlos.
 */

const UuidSchema = z.string().uuid();
const BookingRoleSchema = z
  .string()
  .trim()
  .max(60, 'La etiqueta no puede superar 60 caracteres')
  .nullable();

const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

export const SELECT_FIELDS =
  'id, name, type, fee, expense_budget, budget_status, booking_offer_id, project_id, city, country, venue, show_status, internal_notes, created_at, artist_id, event_date, event_time, formato, is_primary_for_booking, booking_role';

export interface BookingBudgetRow {
  id: string;
  name: string;
  type: string | null;
  fee: number | null;
  expense_budget: number | null;
  budget_status: string | null;
  booking_offer_id: string | null;
  project_id: string | null;
  city: string | null;
  country: string | null;
  venue: string | null;
  show_status: string | null;
  internal_notes: string | null;
  created_at: string;
  artist_id: string | null;
  event_date: string | null;
  event_time: string | null;
  formato: string | null;
  is_primary_for_booking: boolean;
  booking_role: string | null;
}

export class BookingBudgetError extends Error {
  code:
    | 'INVALID_INPUT'
    | 'ALREADY_LINKED_OTHER_BOOKING'
    | 'NOT_FOUND'
    | 'DB_ERROR';
  constructor(code: BookingBudgetError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Lista paginada de presupuestos vinculados a un booking, con `is_primary_for_booking`
 * primero y luego por created_at desc.
 */
export async function listBudgetsForBooking(
  bookingIdRaw: string,
  paginationRaw: { limit?: number; offset?: number } = {},
): Promise<{ items: BookingBudgetRow[]; total: number; hasMore: boolean }> {
  const bookingId = parseUuid(bookingIdRaw);
  const { limit, offset } = PaginationSchema.parse(paginationRaw);

  const { data, error, count } = await supabase
    .from('budgets')
    .select(SELECT_FIELDS, { count: 'exact' })
    .eq('booking_offer_id', bookingId)
    .order('is_primary_for_booking', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new BookingBudgetError('DB_ERROR', error.message);

  const items = (data ?? []) as unknown as BookingBudgetRow[];
  const total = count ?? items.length;
  return { items, total, hasMore: offset + items.length < total };
}

/**
 * Busca presupuestos del mismo artista no vinculados a ningún booking,
 * con búsqueda opcional por nombre y paginación.
 */
export async function searchUnlinkedBudgetsForArtist(params: {
  artistId: string;
  query?: string;
  limit?: number;
  offset?: number;
}): Promise<BookingBudgetRow[]> {
  const artistId = parseUuid(params.artistId);
  const { limit, offset } = PaginationSchema.parse({
    limit: params.limit,
    offset: params.offset,
  });
  const q = (params.query ?? '').trim().slice(0, 100);

  let query = supabase
    .from('budgets')
    .select(SELECT_FIELDS)
    .eq('artist_id', artistId)
    .is('booking_offer_id', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (q.length > 0) {
    // ilike escape: Supabase parameteriza el valor; sólo limitamos longitud y caracteres peligrosos para LIKE.
    const safe = q.replace(/[%_]/g, (m) => `\\${m}`);
    query = query.ilike('name', `%${safe}%`);
  }

  const { data, error } = await query;
  if (error) throw new BookingBudgetError('DB_ERROR', error.message);
  return (data ?? []) as unknown as BookingBudgetRow[];
}

/**
 * Vincula un presupuesto a un booking. Lanza ALREADY_LINKED_OTHER_BOOKING si
 * ya estaba vinculado a otro booking distinto (la UI debe pedir confirmación).
 */
export async function linkBudgetToBooking(
  budgetIdRaw: string,
  bookingIdRaw: string,
  options: { force?: boolean } = {},
): Promise<void> {
  const budgetId = parseUuid(budgetIdRaw);
  const bookingId = parseUuid(bookingIdRaw);

  const { data: existing, error: fetchErr } = await supabase
    .from('budgets')
    .select('id, booking_offer_id')
    .eq('id', budgetId)
    .maybeSingle();

  if (fetchErr) throw new BookingBudgetError('DB_ERROR', fetchErr.message);
  if (!existing) throw new BookingBudgetError('NOT_FOUND', 'Presupuesto no encontrado');

  if (
    existing.booking_offer_id &&
    existing.booking_offer_id !== bookingId &&
    !options.force
  ) {
    throw new BookingBudgetError(
      'ALREADY_LINKED_OTHER_BOOKING',
      'Este presupuesto ya está vinculado a otro evento.',
    );
  }

  const { error } = await supabase
    .from('budgets')
    .update({ booking_offer_id: bookingId })
    .eq('id', budgetId);

  if (error) throw new BookingBudgetError('DB_ERROR', error.message);
}

export async function unlinkBudgetFromBooking(budgetIdRaw: string): Promise<void> {
  const budgetId = parseUuid(budgetIdRaw);
  const { error } = await supabase
    .from('budgets')
    .update({ booking_offer_id: null, is_primary_for_booking: false })
    .eq('id', budgetId);
  if (error) throw new BookingBudgetError('DB_ERROR', error.message);
}

export async function setPrimaryBudget(
  budgetIdRaw: string,
  bookingIdRaw: string,
): Promise<void> {
  const budgetId = parseUuid(budgetIdRaw);
  const bookingId = parseUuid(bookingIdRaw);

  // El trigger se encarga de desmarcar el anterior principal.
  const { error } = await supabase
    .from('budgets')
    .update({ is_primary_for_booking: true })
    .eq('id', budgetId)
    .eq('booking_offer_id', bookingId);
  if (error) throw new BookingBudgetError('DB_ERROR', error.message);
}

export async function updateBudgetRole(
  budgetIdRaw: string,
  roleRaw: string | null,
): Promise<void> {
  const budgetId = parseUuid(budgetIdRaw);
  const parsed = BookingRoleSchema.parse(roleRaw === '' ? null : roleRaw);
  const { error } = await supabase
    .from('budgets')
    .update({ booking_role: parsed })
    .eq('id', budgetId);
  if (error) throw new BookingBudgetError('DB_ERROR', error.message);
}

function parseUuid(raw: string): string {
  const r = UuidSchema.safeParse(raw);
  if (!r.success) {
    throw new BookingBudgetError('INVALID_INPUT', 'Identificador inválido');
  }
  return r.data;
}
