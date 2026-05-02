/**
 * Helpers para normalizar el campo "duración" de un booking.
 * Formato canónico: "Xh Ymin" / "Xh" / "Ymin" / "" (vacío).
 */

export interface DurationParts {
  horas: number;
  minutos: number;
}

/**
 * Parsea cualquier string heredado de duración a { horas, minutos }.
 * Acepta: "1h 30min", "1h30", "1h", "90min", "90'", "90 min", "90", "1:30".
 */
export function parseDuration(input?: string | null): DurationParts {
  if (!input) return { horas: 0, minutos: 0 };
  const raw = String(input).trim().toLowerCase();
  if (!raw) return { horas: 0, minutos: 0 };

  // 1) HH:MM
  const colon = raw.match(/^(\d{1,2}):(\d{1,2})$/);
  if (colon) {
    return { horas: clamp(parseInt(colon[1], 10), 0, 99), minutos: clamp(parseInt(colon[2], 10), 0, 59) };
  }

  // 2) Xh + Y(min|m|') opcional
  const hAndM = raw.match(/^(\d+)\s*h\s*(\d+)\s*(?:min|m|')?$/);
  if (hAndM) {
    return { horas: clamp(parseInt(hAndM[1], 10), 0, 99), minutos: clamp(parseInt(hAndM[2], 10), 0, 59) };
  }

  // 3) Xh solo
  const hOnly = raw.match(/^(\d+)\s*h$/);
  if (hOnly) {
    return { horas: clamp(parseInt(hOnly[1], 10), 0, 99), minutos: 0 };
  }

  // 4) Y minutos solo (90, 90min, 90', 90 min, 90 minutos)
  const mOnly = raw.match(/^(\d+)\s*(?:min|m|'|minutos|minutes)?$/);
  if (mOnly) {
    const total = parseInt(mOnly[1], 10);
    if (!isNaN(total)) {
      const horas = Math.floor(total / 60);
      const minutos = total % 60;
      return { horas: clamp(horas, 0, 99), minutos };
    }
  }

  return { horas: 0, minutos: 0 };
}

/**
 * Devuelve el string canónico para guardar en BBDD.
 * - 1h 30min → "1h 30min"
 * - 2h 0min  → "2h"
 * - 0h 45min → "45min"
 * - 0h 0min  → ""
 */
export function formatDuration(horas: number, minutos: number): string {
  const h = clamp(Math.floor(horas || 0), 0, 99);
  const m = clamp(Math.floor(minutos || 0), 0, 59);
  if (h === 0 && m === 0) return '';
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function clamp(n: number, min: number, max: number): number {
  if (isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}
