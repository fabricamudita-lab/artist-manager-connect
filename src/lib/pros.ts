/**
 * Catálogo de Sociedades de Gestión de Derechos (Performing Rights Organizations).
 * Lista por defecto agrupada por país (ISO-2). Se puede ampliar con sociedades
 * personalizadas por workspace en la tabla `custom_pros`.
 */

export interface ProEntry {
  /** ISO-3166-1 alpha-2 country code (uppercase). */
  country: string;
  /** Short code / acronym used as identifier. */
  code: string;
  /** Display name. */
  name: string;
  /** Optional website (without protocol). */
  website?: string;
}

export const DEFAULT_PROS: ProEntry[] = [
  // España
  { country: 'ES', code: 'SGAE', name: 'SGAE', website: 'sgae.es' },
  // Estados Unidos
  { country: 'US', code: 'ASCAP', name: 'ASCAP', website: 'ascap.com' },
  { country: 'US', code: 'BMI', name: 'BMI', website: 'bmi.com' },
  { country: 'US', code: 'SESAC', name: 'SESAC', website: 'sesac.com' },
  // Reino Unido
  { country: 'GB', code: 'PRS', name: 'PRS for Music', website: 'prsformusic.com' },
  // Latinoamérica
  { country: 'MX', code: 'SACM', name: 'SACM', website: 'sacm.org.mx' },
  { country: 'AR', code: 'SADAIC', name: 'SADAIC', website: 'sadaic.org.ar' },
  { country: 'CO', code: 'SAYCO', name: 'SAYCO', website: 'sayco.org' },
  { country: 'CL', code: 'SCD', name: 'SCD', website: 'scd.cl' },
  { country: 'BR', code: 'ECAD', name: 'ECAD', website: 'ecad.org.br' },
  // Europa
  { country: 'FR', code: 'SACEM', name: 'SACEM', website: 'sacem.fr' },
  { country: 'DE', code: 'GEMA', name: 'GEMA', website: 'gema.de' },
  { country: 'IT', code: 'SIAE', name: 'SIAE', website: 'siae.it' },
  { country: 'PT', code: 'SPA', name: 'SPA', website: 'spautores.pt' },
  { country: 'NL', code: 'BUMA', name: 'Buma/Stemra', website: 'bumastemra.nl' },
  // Otros
  { country: 'CA', code: 'SOCAN', name: 'SOCAN', website: 'socan.com' },
  { country: 'AU', code: 'APRA', name: 'APRA AMCOS', website: 'apraamcos.com.au' },
  { country: 'JP', code: 'JASRAC', name: 'JASRAC', website: 'jasrac.or.jp' },
];

/**
 * Sort PROs putting the matching country first, then alphabetical by name.
 */
export function sortPROsByCountry<T extends { country?: string | null; name: string }>(
  list: T[],
  preferredCountry?: string | null,
): T[] {
  const cc = preferredCountry?.toUpperCase() || '';
  return [...list].sort((a, b) => {
    const aMatch = (a.country || '').toUpperCase() === cc ? 0 : 1;
    const bMatch = (b.country || '').toUpperCase() === cc ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Validate IPI (CISAC) number: 9 to 11 digits. Stored as text to preserve
 * leading zeros.
 */
export const IPI_REGEX = /^\d{9,11}$/;

export function isValidIPI(value: string | null | undefined): boolean {
  if (!value) return true; // optional field
  return IPI_REGEX.test(value.trim());
}
