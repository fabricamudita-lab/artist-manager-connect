

## Plan: Campos personalizados (custom fields) para artistas y contactos

### Contexto actual
- **Contactos** (`contacts`): Usan `field_config` (JSONB) para controlar visibilidad de ~16 campos predefinidos (email, phone, iban, etc.). Los campos son columnas reales en la tabla.
- **Artistas** (`artists`): Tienen ~24 columnas fijas (tallas, salud, fiscal, bancarios). No hay sistema de `field_config` ni campos personalizados.
- **Formularios públicos**: `/artist-form/:token` y `/contact-form/:token` muestran solo campos fijos predefinidos.
- Ninguna de las dos entidades soporta campos personalizados definidos por el usuario.

### Problema
El usuario quiere poder **añadir nuevos campos** más allá de los predefinidos, tanto en la ficha interna como en los formularios públicos. Esto aplica a contactos y artistas.

### Solución: Tabla `custom_fields` + columna JSONB `custom_data`

#### 1. Base de datos (migración)

**Nueva tabla `custom_fields`** — Catálogo de campos personalizados reutilizables:
```sql
CREATE TABLE public.custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('artist', 'contact')),
  field_key text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'textarea', 'number', 'date', 'url', 'email', 'phone')),
  section text DEFAULT 'custom',
  sort_order integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, entity_type, field_key)
);

ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own workspace custom fields"
  ON public.custom_fields FOR ALL TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_memberships WHERE user_id = auth.uid()
  ));
```

**Añadir `custom_data` JSONB a `artists` y `contacts`:**
```sql
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS custom_data jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS custom_data jsonb DEFAULT '{}'::jsonb;
```

**Política RLS para que `anon` pueda leer custom_fields (para formularios públicos):**
```sql
CREATE POLICY "Anon can read custom fields for forms"
  ON public.custom_fields FOR SELECT TO anon USING (true);
```

**Actualizar política existente de contacts para incluir custom_data en updates anónimos** (ya permitido por las políticas existentes de `contact_form_tokens`).

**Índices:**
```sql
CREATE INDEX idx_custom_fields_entity ON public.custom_fields(workspace_id, entity_type);
CREATE INDEX idx_artist_form_tokens_active ON public.artist_form_tokens(artist_id, is_active);
CREATE INDEX idx_contact_form_tokens_active ON public.contact_form_tokens(contact_id, is_active);
```

#### 2. UI interna — Añadir campos personalizados

| Archivo | Cambio |
|---------|--------|
| `src/components/ArtistInfoDialog.tsx` | En modo edición, añadir sección "Campos personalizados" al final que: (a) muestra los campos existentes de `custom_data`, (b) tiene botón "+ Añadir campo" que abre un mini-form inline para definir label y tipo, (c) guarda en `custom_fields` + actualiza `custom_data` en `artists` |
| `src/components/EditContactDialog.tsx` | Mismo patrón: sección de campos personalizados con toggle de visibilidad integrado en `field_config`, valores en `custom_data` |

#### 3. Formularios públicos

| Archivo | Cambio |
|---------|--------|
| `src/pages/PublicArtistForm.tsx` | Cargar `custom_fields` del workspace del artista (via join) y renderizar campos adicionales usando `custom_data`. Guardar valores de vuelta a `custom_data` |
| `src/pages/PublicContactForm.tsx` | Cargar `custom_fields` del workspace del contacto y renderizar solo los que estén activados en `field_config`. Guardar a `custom_data` |

#### 4. Hook reutilizable

Crear `src/hooks/useCustomFields.ts`:
- Carga campos de `custom_fields` filtrados por `entity_type` y `workspace_id`
- Funciones para crear/eliminar campos
- Cache con React Query

### Flujo del usuario
1. Manager edita artista/contacto → ve sección "Campos personalizados"
2. Pulsa "+ Añadir campo" → escribe label (ej. "DNI cónyuge"), elige tipo (text/number/date/etc.)
3. Se crea registro en `custom_fields` y queda disponible para todas las entidades del mismo tipo en el workspace
4. El valor se guarda en `custom_data` JSONB de esa entidad específica
5. En formularios públicos, los campos personalizados aparecen automáticamente en una sección final

### Seguridad
- `custom_fields` protegido por RLS de workspace
- `custom_data` es JSONB libre pero los formularios públicos solo permiten escribir claves que existan en `custom_fields`
- Los valores se sanitizan (trim, longitud máxima) en el cliente antes de guardar
- `anon` solo puede leer `custom_fields` (no crear/modificar)

### Escalabilidad
- JSONB `custom_data` evita migraciones por cada campo nuevo
- `custom_fields` es un catálogo por workspace, reutilizable entre entidades
- Índices GIN opcionales en `custom_data` si se necesita búsqueda en el futuro

