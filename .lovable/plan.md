## Selector estructurado de Duración (horas + minutos)

Sustituir el input libre de "Duración" por dos campos numéricos pequeños (Horas / Minutos) que generan siempre un formato canónico `Xh Ymin`. Así desaparece la posibilidad de escribir "1h30", "90min", "90'", etc.

### Comportamiento UX
- Dos inputs numéricos juntos:
  - **Horas** (0-12, paso 1)
  - **Minutos** (0-59, paso 5)
- Se guarda en `booking.duracion` como string canónico:
  - `1` h y `30` min → `"1h 30min"`
  - `2` h y `0` min → `"2h"`
  - `0` h y `45` min → `"45min"`
  - ambos `0`/vacío → `null`
- Al **abrir** el diálogo, se parsea el valor existente (cualquier formato heredado: `1h30`, `90min`, `90'`, `1:30`, `1h 30min`) a `{horas, minutos}` para no perder datos.

### Cambios técnicos

**1. Nuevo helper `src/lib/duration.ts`**
```ts
// Devuelve { horas, minutos } a partir de cualquier string heredado
export function parseDuration(input?: string | null): { horas: number; minutos: number };

// Devuelve string canónico "Xh Ymin" / "Xh" / "Ymin" / "" 
export function formatDuration(horas: number, minutos: number): string;
```

Reglas de parseo (en orden):
1. `HH:MM` (`1:30`) → 1h 30min
2. `Xh Ymin` / `XhYmin` / `Xh Y` (`1h 30min`, `1h30`)
3. `Xh` solo
4. `Ymin` / `Y'` / `Y min` / número solo (`90`, `90min`, `90'`)
5. fallback: `{0,0}`

**2. Nuevo componente `DurationInput`** (`src/components/booking-detail/DurationInput.tsx`)
- Renderiza dos `Input type="number"` etiquetados "h" y "min" en línea.
- Props: `value: string | null`, `onChange: (v: string | null) => void`.
- Internamente mantiene estado local `{horas, minutos}` y emite el string canónico mediante `formatDuration`.

**3. Sustituciones**
Reemplazar el `Input` actual por `<DurationInput />` en:
- `src/components/booking-detail/EditBookingDialog.tsx` (línea ~468-473)
- `src/components/CreateBookingDialog.tsx` (línea ~269)

### Compatibilidad
- No se necesita migración de BBDD. El campo sigue siendo `text`. Los valores antiguos se siguen mostrando tal cual en Calendar, Overview, contratos, PDFs (`booking.duracion` sigue siendo string).
- La primera vez que un booking heredado se edite y se guarde, su valor quedará normalizado al formato canónico.

### Fuera de alcance (intencionadamente)
- No se toca el campo `duracion` de tracks en `IPLicenseGenerator` (es `MM:SS` para canciones, otro contexto).
- No se toca el `duracion` de `CreateSolicitudFromTemplateDialog` (es libre y para descripción de solicitudes).
- No se hace migración masiva de valores históricos en BBDD; se normalizan on-edit.