

## Plan: Nueva sección "Contratos" en Release Detail

### Objetivo
Añadir una tarjeta "Contratos" en la vista de detalle del lanzamiento para gestionar documentos legales de cesión de derechos, acuerdos de royalties, licencias, etc. — similar al sistema de contratos de Booking pero adaptado al contexto discográfico.

### Cambios

**1. Nueva tabla DB: `release_documents`**

Migración SQL para crear una tabla análoga a `booking_documents` pero vinculada a releases:

```sql
CREATE TABLE public.release_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid REFERENCES public.releases(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_url text,
  file_type text DEFAULT 'application/pdf',
  document_type text NOT NULL DEFAULT 'contract',
  status text NOT NULL DEFAULT 'draft',
  content text,
  contract_token text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.release_documents ENABLE ROW LEVEL SECURITY;
-- RLS policies for authenticated users (same pattern as booking_documents)
```

Tipos de documento: `contract` (cesión derechos), `license` (licencia), `publishing_agreement` (acuerdo editorial), `distribution_agreement` (acuerdo distribución), `other`.

**2. Nueva sección en `ReleaseDetail.tsx`**

Añadir entrada al array `SECTIONS`:
- id: `contratos`
- title: "Contratos"
- description: "Contratos de royalties, cesión de derechos y licencias"
- icon: `FileSignature` (o `ScrollText`)
- color: amber/yellow gradient

**3. Nueva página: `src/pages/release-sections/ReleaseContratos.tsx`**

Funcionalidad:
- **Subir documentos**: Upload de PDFs/archivos de contratos
- **Tipos de documento**: Selector con tipos relevantes (Cesión de derechos, Licencia, Acuerdo editorial, Acuerdo de distribución, Otro)
- **Estados**: draft → sent → pending_signature → signed
- **Listado**: Tarjetas colapsables con nombre, tipo, estado y fecha
- **Previsualización**: Abrir PDFs directamente
- **Notas**: Campo de notas por documento

Reutiliza patrones visuales y de UX del `BookingDocumentsTab` existente, adaptados al contexto de releases.

**4. Ruta en `App.tsx`**

Añadir: `/releases/:id/contratos` → `<ReleaseContratos />`

### Archivos afectados
- Nueva migración SQL (tabla `release_documents` + RLS)
- `src/pages/ReleaseDetail.tsx` — nueva entrada en SECTIONS
- `src/pages/release-sections/ReleaseContratos.tsx` — nuevo componente
- `src/App.tsx` — nueva ruta

### Nota
No se incluye generador de contratos automático en esta fase (a diferencia de Booking). Se centra en subida, categorización y seguimiento de estado de documentos legales vinculados al release.

