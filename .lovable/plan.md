

## Análisis

Dos peticiones relacionadas con metadata de publishing:

1. **Sociedades de gestión (PRO)** — Lista por defecto según país (SGAE/ES, ASCAP/BMI/SESAC/US, PRS/UK, SACM/MX, SADAIC/AR…) con opción de añadir nuevas que queden registradas para futuro uso.
2. **Número IPI** — Campo obligatorio (11 dígitos) en perfil de artista y de contacto, ya que sin IPI las regalías no se distribuyen.

La captura muestra el input actual "Sociedad (PRO) — ej. SGAE, BMI", que es texto libre. Hay que convertirlo en combobox con sugerencias por país + custom + persistencia.

## Exploración previa necesaria
- Buscar dónde está el input "Sociedad (PRO)" → probablemente en `AddCreditWithProfileForm.tsx` o un sub-componente de perfil publishing.
- `src/lib/` para ver si ya existe constante de PROs o países.
- Estructura tabla `artists` y `contacts` (o `profiles`) para añadir `ipi_number`.
- `field_config` JSONB en perfiles (memoria `mem://contacts/profile-system-config`) — puede ser el lugar natural para `ipi_number` si no queremos columna nueva.

## Plan

### 1. Catálogo de PROs (datos seed + tabla custom)

**a) Constante estática** `src/lib/pros.ts`:
```ts
export const DEFAULT_PROS: { country: string; code: string; name: string; website?: string }[] = [
  { country: 'ES', code: 'SGAE', name: 'SGAE', website: 'sgae.es' },
  { country: 'US', code: 'ASCAP', name: 'ASCAP' },
  { country: 'US', code: 'BMI', name: 'BMI' },
  { country: 'US', code: 'SESAC', name: 'SESAC' },
  { country: 'GB', code: 'PRS', name: 'PRS for Music' },
  { country: 'MX', code: 'SACM', name: 'SACM' },
  { country: 'AR', code: 'SADAIC', name: 'SADAIC' },
  // + otras comunes: SACEM (FR), GEMA (DE), SIAE (IT), SOCAN (CA), APRA (AU), JASRAC (JP)…
];
```

**b) Tabla `custom_pros`** (mismo patrón que `custom_instruments`):
```text
custom_pros
  id            uuid PK
  workspace_id  uuid FK workspaces (NOT NULL)
  name          text (1-100, único case-insensitive por workspace)
  country       text (ISO-2, opcional)
  created_by    uuid
  created_at    timestamptz
```
- RLS: SELECT/INSERT para miembros del workspace; DELETE para OWNER (`user_is_workspace_owner`).
- Índice único `(workspace_id, lower(name))`.

### 2. Componente `PROCombobox`

Reutilizable, recibe `country` opcional para priorizar sugerencias.

- Muestra primero PROs del país detectado (fallback al país del workspace o del artista).
- Después el resto de defaults.
- Después customs del workspace.
- Opción "+ Añadir nueva sociedad" → modal mínimo (nombre + país opcional) → inserta en `custom_pros` y la selecciona.
- Validación Zod (`name` 1-100 chars, `country` ISO-2).
- Hook `useCustomPros(workspaceId)` con React Query (cache + invalidación).

Sustituye el input libre actual de "Sociedad (PRO)" en el formulario de credit/profile.

### 3. Campo IPI

**a) Esquema:**
- Añadir columna `ipi_number text` a las tablas `artists` y `contacts` (o `profiles` según donde vivan los autores). 
- Validación: 9–11 dígitos numéricos (formato CISAC). Almaceno como `text` para preservar ceros a la izquierda.
- Index opcional para búsquedas.

**b) UI:**
- En `ArtistInfoDialog` → sección "Identidad profesional / Publishing": añadir campo "Número IPI (CISAC)" + "Sociedad (PRO)" usando el nuevo `PROCombobox`.
- En el formulario de contacto (perfil colaborador) misma cosa cuando el contacto tenga rol de autoría/compositor.
- En `AddCreditWithProfileForm.tsx` (sección publishing) mostrar IPI + PRO debajo del split %, y permitir editarlos inline (se guardan en el perfil del autor, no en el split — así se reutilizan en futuros releases).

**c) Validación visual:**
- Si autor tiene split de publishing > 0 y NO tiene IPI → badge ámbar "Sin IPI – las regalías pueden no distribuirse" (similar al sistema de Health Center existente).
- Integrar en `Release Health Center` como nueva dimensión.

### 4. PDF de créditos

Extender `exportSplitsPDF.ts` para mostrar "IPI" y "PRO" junto a cada autor en la sección Publishing (formato: `Nombre — IPI 00123456789 — SGAE`).

### 5. Capa de datos / seguridad
- Validación Zod cliente para IPI (`/^\d{9,11}$/`) y PRO custom name.
- Sin paginación (volumen mínimo).
- RLS estricta por workspace en `custom_pros`.
- Sin tocar auth.

### Cambios resumidos

| Área | Archivo |
|---|---|
| Migración DB | nueva tabla `custom_pros` + columnas `ipi_number` en `artists` y `contacts` |
| Constantes | `src/lib/pros.ts` |
| Hook | `src/hooks/useCustomPros.ts` |
| Componente | `src/components/credits/PROCombobox.tsx` |
| Form crédito | `src/components/credits/AddCreditWithProfileForm.tsx` (reemplazar input libre + añadir IPI) |
| Perfil artista | `src/components/artists/ArtistInfoDialog.tsx` (campos IPI + PRO) |
| Perfil contacto | formulario equivalente de contactos |
| PDF | `src/utils/exportSplitsPDF.ts` |
| Health Center | `src/components/releases/...` añadir check IPI |

