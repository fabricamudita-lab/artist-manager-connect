import { INTERPRETE_ROLES } from '@/lib/creditRoles';

export interface InstrumentOption {
  value: string;
  label: string;
  isCustom?: boolean;
}

const EXCLUDED_ROLE_VALUES = new Set([
  'otro_instrumento',
  'interprete',
  'intérprete',
  'featured',
  'musico_sesion',
]);

const normalizeInstrumentKey = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

export const normalizeInstrumentLabel = (value: string) =>
  value.trim().replace(/\s+/g, ' ');

export const DITTO_INSTRUMENTS: InstrumentOption[] = INTERPRETE_ROLES
  .filter((role) => !EXCLUDED_ROLE_VALUES.has(role.value))
  .reduce<InstrumentOption[]>((acc, role) => {
    const normalizedLabel = normalizeInstrumentKey(role.label);
    if (acc.some((item) => normalizeInstrumentKey(item.label) === normalizedLabel)) {
      return acc;
    }

    acc.push({
      value: role.value,
      label: role.label,
    });

    return acc;
  }, []);

export const getInstrumentLabel = (
  value: string,
  customInstruments: InstrumentOption[] = [],
): string => {
  const normalizedValue = normalizeInstrumentKey(value);
  const match = [...DITTO_INSTRUMENTS, ...customInstruments].find(
    (instrument) =>
      instrument.value === value ||
      normalizeInstrumentKey(instrument.label) === normalizedValue,
  );

  return match?.label || value;
};
