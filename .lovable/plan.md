

# Gestion de Riders por Formato de Booking

## Contexto

Actualmente cada formato de booking tiene un unico campo `rider_url` que permite subir un solo PDF. El usuario necesita:
- Poder subir multiples riders por formato (distintas versiones)
- Soportar distintos idiomas (ES, EN, FR, PT, etc.)
- Soportar distintos formatos de archivo (PDF, Word, etc.)
- Opcion de "Crear Rider" (un editor basico para generar un rider desde la app)

## Cambios

### 1. Nueva tabla `booking_product_riders`

Crear una migracion SQL con la tabla:

```text
booking_product_riders
- id (uuid, PK)
- booking_product_id (uuid, FK -> booking_products.id ON DELETE CASCADE)
- name (text) -- ej: "Rider Tecnico v2"
- language (text) -- ej: "es", "en", "fr"
- file_url (text, nullable) -- URL del archivo subido
- content (text, nullable) -- contenido del rider creado en la app (markdown/texto)
- file_type (text) -- "pdf", "docx", "created" (creado en app)
- version (integer, default 1)
- is_active (boolean, default true)
- created_by (uuid, FK -> auth.users)
- created_at (timestamptz)
- updated_at (timestamptz)
```

Con RLS habilitado y politicas para usuarios autenticados.

### 2. Nuevo componente `RiderManagerDialog`

Un dialogo que se abre al pulsar en la seccion "Rider Tecnico" de un formato. Contiene:

- **Lista de riders existentes**: tarjetas con nombre, idioma (badge), tipo (PDF/Word/Creado), version, y acciones (ver, descargar, eliminar)
- **Boton "Subir Rider"**: sube un archivo (PDF, DOCX) al storage `artist-assets` y crea el registro
- **Boton "Crear Rider"**: abre un formulario con campos de texto (titulo, secciones como "Audio", "Iluminacion", "Backline", "Monitores", etc.) que genera un rider y lo guarda como contenido en la base de datos. Se podra exportar a PDF con jsPDF (ya instalado)
- **Selector de idioma**: dropdown con opciones ES, EN, FR, PT, DE, IT
- **Campo de version**: autoincremental o editable

### 3. Modificar `ArtistFormatsDialog.tsx`

En la seccion "Rider Tecnico (PDF)" (lineas 935-978):
- Reemplazar el boton simple "Subir Rider" por un boton que muestre el conteo de riders y abra el `RiderManagerDialog`
- Si hay riders, mostrar badges con idioma y cantidad
- Mantener compatibilidad: si ya existe un `rider_url` en el formato, mostrarlo como rider legacy

### 4. Modificar `Step5BookingFormats.tsx` (onboarding)

En la seccion de rider del onboarding (lineas 213-253):
- Reemplazar igualmente por el nuevo boton que abre `RiderManagerDialog`
- Como en onboarding el producto aun no tiene ID en BD, los riders se guardan en un estado temporal y se persisten al finalizar el wizard

## Detalle tecnico

### Archivos nuevos
- `supabase/migrations/XXXX_create_booking_product_riders.sql` -- tabla + RLS
- `src/components/RiderManagerDialog.tsx` -- dialogo principal con lista, subida y creacion
- `src/components/RiderCreatorForm.tsx` -- formulario para crear un rider desde cero con secciones predefinidas

### Archivos modificados
- `src/components/ArtistFormatsDialog.tsx` -- reemplazar seccion rider (lineas 935-978)
- `src/components/onboarding/steps/Step5BookingFormats.tsx` -- reemplazar seccion rider (lineas 213-253)
- `src/integrations/supabase/types.ts` -- se regenerara automaticamente con la nueva tabla

### Flujo del RiderCreatorForm
1. El usuario rellena secciones predefinidas: PA/Audio, Monitores, Backline, Iluminacion, Escenario, Otros
2. Al guardar, el contenido se almacena como texto/markdown en `booking_product_riders.content`
3. Boton "Exportar PDF" genera un PDF usando jsPDF con el contenido formateado

