

## Plan: Auto-rellenar nombres de firma

### Cambio

En `src/components/IPLicenseGenerator.tsx`, pre-rellenar automáticamente los campos de firma a partir de datos ya introducidos:

- `firma_productora`: sincronizar con `productora_nombre` (nombre completo de la productora, paso 1)
- `firma_colaboradora`: sincronizar con `colaboradora_nombre` (nombre completo del colaborador/a, paso 1)

La lógica será igual que la ya implementada para `acreditacion_nombre`: se auto-rellena si el campo está vacío o coincide con el valor anterior, permitiendo sobrescritura manual.

### Archivo afectado
- `src/components/IPLicenseGenerator.tsx` — añadir dos condiciones más en la función `update()`

