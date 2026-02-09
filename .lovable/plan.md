

# Plantillas predeterminadas para Configuracion de Campos

## Resumen

Anadir un selector de plantillas en la parte superior del panel "Configuracion de Campos" (tanto en `CreateContactDialog` como en `EditContactDialog`). Al seleccionar una plantilla, se activan automaticamente los campos relevantes para ese tipo de miembro. El usuario puede seguir personalizando despues.

## Las 6 plantillas propuestas

| Plantilla | Campos activados |
|-----------|-----------------|
| **Miembro de banda** | stage_name, legal_name, email, phone, address, bank_info, iban, clothing_size, shoe_size, allergies, preferred_hours |
| **Equipo tecnico** | legal_name, email, phone, company, role, preferred_hours, special_needs |
| **Management / Booking** | legal_name, email, phone, company, role, contract_url, notes |
| **Legal / Editorial** | legal_name, email, phone, company, contract_url, bank_info, iban, notes |
| **Produccion / Comunicacion** | stage_name, legal_name, email, phone, company, role, notes |
| **Completo** | Todos los campos activados |

## Interfaz

Debajo del titulo "Configuracion de Campos" se anade un `Select` (dropdown) con las 6 opciones. Al seleccionar una, se sobreescriben los toggles con la configuracion de la plantilla. Un valor extra "Personalizado" aparece automaticamente si el usuario modifica toggles manualmente despues de aplicar una plantilla.

```text
+----------------------------+
| Configuracion de Campos    |
|                            |
| Plantilla:                 |
| [ Miembro de banda    v ]  |
|                            |
| Nombre artistico    [ON]   |
| Nombre legal        [ON]   |
| Email               [ON]   |
| ...                        |
+----------------------------+
```

## Detalles tecnicos

### Nuevo archivo: `src/lib/fieldConfigPresets.ts`
Define las 6 plantillas como un map de nombre a objeto `fieldConfig` (los mismos campos del `FIELD_LABELS`).

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/lib/fieldConfigPresets.ts` | Nuevo - definicion de las 6 plantillas |
| `src/components/CreateContactDialog.tsx` | Anadir `Select` de plantillas antes de los toggles, aplicar preset al cambiar |
| `src/components/EditContactDialog.tsx` | Mismo cambio que CreateContactDialog |

### Logica
- Al seleccionar una plantilla del dropdown, se llama `setFieldConfig(PRESETS[selected])` sobrescribiendo todos los toggles
- Si el usuario modifica un toggle despues, el dropdown cambia a "Personalizado"
- La deteccion de "Personalizado" se hace comparando el estado actual con todos los presets

