export type FieldConfig = Record<string, boolean>;

export interface FieldPreset {
  label: string;
  config: FieldConfig;
}

const allFalse: FieldConfig = {
  stage_name: false,
  legal_name: false,
  email: false,
  phone: false,
  address: false,
  bank_info: false,
  iban: false,
  clothing_size: false,
  shoe_size: false,
  allergies: false,
  special_needs: false,
  contract_url: false,
  preferred_hours: false,
  company: false,
  role: false,
  notes: false,
};

const allTrue: FieldConfig = Object.fromEntries(
  Object.keys(allFalse).map(k => [k, true])
);

export const FIELD_PRESETS: Record<string, FieldPreset> = {
  band_member: {
    label: 'Miembro de banda',
    config: {
      ...allFalse,
      stage_name: true,
      legal_name: true,
      email: true,
      phone: true,
      address: true,
      bank_info: true,
      iban: true,
      clothing_size: true,
      shoe_size: true,
      allergies: true,
      preferred_hours: true,
    },
  },
  technical_crew: {
    label: 'Equipo técnico',
    config: {
      ...allFalse,
      legal_name: true,
      email: true,
      phone: true,
      company: true,
      role: true,
      preferred_hours: true,
      special_needs: true,
    },
  },
  management_booking: {
    label: 'Management / Booking',
    config: {
      ...allFalse,
      legal_name: true,
      email: true,
      phone: true,
      company: true,
      role: true,
      contract_url: true,
      notes: true,
    },
  },
  legal_editorial: {
    label: 'Legal / Editorial',
    config: {
      ...allFalse,
      legal_name: true,
      email: true,
      phone: true,
      company: true,
      contract_url: true,
      bank_info: true,
      iban: true,
      notes: true,
    },
  },
  production_comms: {
    label: 'Producción / Comunicación',
    config: {
      ...allFalse,
      stage_name: true,
      legal_name: true,
      email: true,
      phone: true,
      company: true,
      role: true,
      notes: true,
    },
  },
  complete: {
    label: 'Completo',
    config: allTrue,
  },
};

/**
 * Returns the preset key matching the current field config, or 'custom' if none match.
 */
export function detectPreset(current: FieldConfig): string {
  for (const [key, preset] of Object.entries(FIELD_PRESETS)) {
    const match = Object.keys(preset.config).every(
      field => !!current[field] === !!preset.config[field]
    );
    if (match) return key;
  }
  return 'custom';
}
