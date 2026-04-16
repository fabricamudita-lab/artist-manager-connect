

## Plan: Edición de campos en perfiles del roster + Formulario público para contactos

### Problema
1. **Artistas del roster**: Al hacer clic en un artista desde Equipos, se abre `ArtistInfoDialog`, que muestra campos fijos sin posibilidad de configurar qué campos solicitar (no tiene el sistema de `field_config` con toggles que sí tiene `EditContactDialog`). Tampoco permite editar campos como tallas, alergias, banco, etc., a menos que seas management.
2. **Formulario público para contactos**: Los contactos no tienen un equivalente al `/artist-form/:token` para que puedan rellenar su propia información sin acceder a la app.

### Solución

#### 1. Mejorar ArtistInfoDialog para roster
- Hacer visibles **todos los campos** por defecto (contacto, tallas, salud, banco, notas) sin restricción de `canEdit` para lectura — actualmente los bloques de Datos Fiscales, Bancarios están ocultos con `{canEdit && ...}`
- Permitir edición de todos los campos para usuarios con rol management (ya funciona, solo falta mostrarlos)
- Quitar las condiciones `{canEdit && ...}` que ocultan secciones enteras para lectura — todos los datos del artista deben ser visibles para cualquier usuario con acceso

#### 2. Crear sistema de formulario público para contactos (similar a artist_form_tokens)

**Base de datos** — nueva tabla y políticas RLS:
```sql
CREATE TABLE public.contact_form_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE DEFAULT substring(gen_random_uuid()::text from 1 for 36) NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.contact_form_tokens ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage tokens they created
CREATE POLICY "Users manage own contact form tokens"
  ON public.contact_form_tokens FOR ALL TO authenticated
  USING (created_by = auth.uid());

-- Anon can read active tokens (for form validation)
CREATE POLICY "Anon can read active tokens"
  ON public.contact_form_tokens FOR SELECT TO anon
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Anon can read contacts with valid tokens
CREATE POLICY "Anon can read contacts via form token"
  ON public.contacts FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.contact_form_tokens
    WHERE contact_form_tokens.contact_id = contacts.id
      AND contact_form_tokens.is_active = true
      AND (contact_form_tokens.expires_at IS NULL OR contact_form_tokens.expires_at > now())
  ));

-- Anon can update contacts via valid token
CREATE POLICY "Anon can update contacts via form token"
  ON public.contacts FOR UPDATE TO anon
  USING (EXISTS (
    SELECT 1 FROM public.contact_form_tokens
    WHERE contact_form_tokens.contact_id = contacts.id
      AND contact_form_tokens.is_active = true
      AND (contact_form_tokens.expires_at IS NULL OR contact_form_tokens.expires_at > now())
  ));
```

**Nuevos archivos**:

| Archivo | Descripción |
|---------|-------------|
| `src/pages/PublicContactForm.tsx` | Formulario público que lee `field_config` del contacto y solo muestra los campos activados. Similar a `PublicArtistForm.tsx` |

**Archivos modificados**:

| Archivo | Cambio |
|---------|--------|
| `src/components/ArtistInfoDialog.tsx` | Eliminar `{canEdit && ...}` de secciones de lectura (Fiscal, Bancarios). Mantener la restricción solo para edición |
| `src/components/EditContactDialog.tsx` | Añadir botón "Formulario" que genera/copia enlace público usando `contact_form_tokens` |
| `src/App.tsx` | Añadir ruta `/contact-form/:token` fuera de `ProtectedRoute` |

**Flujo del formulario público de contacto**:
1. Manager abre `EditContactDialog` → activa los campos deseados con los toggles → pulsa botón "Formulario"
2. Se genera/recupera un token en `contact_form_tokens`
3. Se copia al portapapeles: `https://artist-manager-connect.lovable.app/contact-form/{token}`
4. El contacto abre el enlace → ve solo los campos activados en `field_config` → rellena y guarda

