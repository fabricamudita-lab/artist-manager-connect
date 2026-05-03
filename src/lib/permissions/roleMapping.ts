/**
 * Mapeo único: rol funcional global → rol que se guarda en
 * `artist_role_bindings.role`.
 *
 * El rol funcional manda. El binding por artista solo controla acceso
 * (presencia/ausencia) y replica el rol funcional para mantener un único
 * source of truth.
 */

export type ArtistBindingRole =
  | 'ARTIST_MANAGER'
  | 'ARTIST_OBSERVER'
  | 'BOOKING_AGENT'
  | 'PRODUCER'
  | 'LABEL'
  | 'PUBLISHER'
  | 'AR'
  | 'ROADIE_TECH';

/**
 * Mapeo de strings de rol funcional (tal como se guardan en `contacts.role`)
 * al enum de `artist_role_bindings.role`.
 *
 * Las claves se comparan en minúsculas y sin acentos para tolerar variantes
 * (p. ej. "Mánager Personal", "Manager personal", "MANAGER").
 */
const RAW_MAP: Record<string, ArtistBindingRole> = {
  'manager personal': 'ARTIST_MANAGER',
  'manager': 'ARTIST_MANAGER',
  'artist manager': 'ARTIST_MANAGER',
  'management': 'ARTIST_MANAGER',
  'agente de booking': 'BOOKING_AGENT',
  'booking agent': 'BOOKING_AGENT',
  'booker': 'BOOKING_AGENT',
  'productor': 'PRODUCER',
  'producer': 'PRODUCER',
  'productor musical': 'PRODUCER',
  'sello': 'LABEL',
  'label': 'LABEL',
  'discografica': 'LABEL',
  'editorial': 'PUBLISHER',
  'publisher': 'PUBLISHER',
  'a&r': 'AR',
  'ar': 'AR',
  'tecnico': 'ROADIE_TECH',
  'tecnico/roadie': 'ROADIE_TECH',
  'roadie': 'ROADIE_TECH',
  'observador': 'ARTIST_OBSERVER',
  'observer': 'ARTIST_OBSERVER',
  'artista': 'ARTIST_OBSERVER',
  'artist': 'ARTIST_OBSERVER',
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Devuelve el rol del binding correspondiente al rol funcional dado.
 * Si no hay rol funcional o no encaja en el mapeo, devuelve ARTIST_OBSERVER
 * (acceso de solo lectura).
 */
export function mapFunctionalRoleToBindingRole(
  functionalRole: string | null | undefined,
): ArtistBindingRole {
  if (!functionalRole) return 'ARTIST_OBSERVER';
  const key = normalize(functionalRole);
  return RAW_MAP[key] ?? 'ARTIST_OBSERVER';
}

/**
 * Etiqueta legible del binding role para mostrar en UI.
 */
export function bindingRoleLabel(role: ArtistBindingRole): string {
  switch (role) {
    case 'ARTIST_MANAGER':
      return 'Manager (acceso completo)';
    case 'BOOKING_AGENT':
      return 'Booking Agent';
    case 'PRODUCER':
      return 'Productor';
    case 'LABEL':
      return 'Sello';
    case 'PUBLISHER':
      return 'Editorial';
    case 'AR':
      return 'A&R';
    case 'ROADIE_TECH':
      return 'Técnico / Roadie';
    case 'ARTIST_OBSERVER':
      return 'Observador (solo lectura)';
  }
}
