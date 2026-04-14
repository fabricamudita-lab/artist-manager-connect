

## Plan: Sistema de Borradores y Negociación de Contratos

### Resumen
Implementar un flujo completo de gestión de borradores para contratos (IP License y Booking) con estados, link compartible de lectura/comentarios, y sincronización en tiempo real via Supabase Realtime.

### Fase 1: Base de datos (3 migraciones)

**Migración 1 — Tabla `contract_drafts`**
```sql
create type contract_draft_status as enum ('borrador', 'en_negociacion', 'listo_para_firma', 'firmado');
create type contract_draft_type as enum ('ip_license', 'booking');

create table contract_drafts (
  id uuid primary key default gen_random_uuid(),
  draft_type contract_draft_type not null,
  status contract_draft_status not null default 'borrador',
  title text not null,
  form_data jsonb not null,        -- formData serializado
  clauses_data jsonb,              -- ipClauses / booking clauses
  share_token text unique default encode(gen_random_bytes(24), 'hex'),
  created_by uuid references auth.users(id) not null,
  release_id uuid references releases(id),
  booking_id uuid references booking_offers(id),
  artist_id uuid references artists(id),
  signed_pdf_url text,
  firma_fecha text,
  firma_lugar text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: creator can do everything, share_token allows public read
alter table contract_drafts enable row level security;

create policy "Owner full access" on contract_drafts
  for all to authenticated
  using (created_by = auth.uid());

create policy "Public read via token" on contract_drafts
  for select to anon
  using (share_token is not null);
```

**Migración 2 — Tabla `contract_draft_comments`**
```sql
create table contract_draft_comments (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid references contract_drafts(id) on delete cascade not null,
  section_key text not null,       -- ej. "clausula_3", "datos_productora"
  message text not null,
  author_name text not null,       -- para usuarios no autenticados
  author_profile_id uuid references profiles(id),
  parent_comment_id uuid references contract_draft_comments(id),
  resolved boolean default false,
  created_at timestamptz default now()
);

alter table contract_draft_comments enable row level security;
-- Authenticated users: full access on their draft's comments
-- Anon: can insert and select (via share_token validated in app)
create policy "Auth read/write" on contract_draft_comments
  for all to authenticated using (true);
create policy "Anon read" on contract_draft_comments
  for select to anon using (true);
create policy "Anon insert" on contract_draft_comments
  for insert to anon with check (true);
```

**Migración 3 — Trigger updated_at + Realtime**
```sql
create trigger update_contract_drafts_updated_at
  before update on contract_drafts
  for each row execute function moddatetime(updated_at);

alter publication supabase_realtime add table contract_drafts;
alter publication supabase_realtime add table contract_draft_comments;
```

### Fase 2: Componentes Frontend

#### 2a. Hook `useContractDrafts`
- `src/hooks/useContractDrafts.ts`
- CRUD para borradores: `saveDraft`, `updateDraft`, `updateStatus`, `deleteDraft`, `fetchDrafts`
- Suscripción Realtime para cambios en `contract_drafts` y `contract_draft_comments`

#### 2b. Modificar `IPLicenseGenerator.tsx` (paso 5)
- Añadir botón **"Guardar borrador"** (variant outline) junto a "Generar PDF"
- Al guardar: serializa `formData` + `ipClauses` → inserta en `contract_drafts`
- Si el borrador ya existe (editando), actualiza en vez de insertar
- Mostrar **banner de estado** en la cabecera del dialog:
  - Borrador (gris), En negociación (amarillo), Listo para firma (verde), Firmado (azul)
- Botón **"Compartir link"** visible cuando status es `en_negociacion`
- Botón **"Generar PDF"** solo habilitado en status `listo_para_firma` o cuando no hay draft
- Prop opcional `draftId` para cargar un borrador existente y seguir editándolo

#### 2c. Mismos cambios en `ContractGenerator.tsx`
- Misma lógica de borrador para contratos de booking

#### 2d. Página pública `/contract-draft/:token`
- `src/pages/ContractDraftView.tsx`
- Carga el draft por `share_token` (query anon)
- Renderiza el contrato con formato profesional (HTML, no PDF) — reutilizando datos del `form_data`
- **Sidebar de comentarios**: agrupados por sección del contrato
- Cada sección del contrato tiene un icono para añadir comentario
- Thread de respuestas por comentario
- Indicador "Última actualización: hace X minutos" con Realtime
- Botón "Marcar como listo para firma" — solo visible si el usuario autenticado es el `created_by`
- Suscripción Realtime: cualquier cambio al `form_data` o nuevos comentarios se reflejan instantáneamente

#### 2e. Panel de gestión de borradores
- Añadir pestaña/sección en `src/pages/Documents.tsx` y en `ReleaseContratos.tsx`
- Lista de borradores con: título, estado (badge), fecha, acciones rápidas
- Filtros por estado
- Acciones: Editar (reabre wizard con datos), Compartir link, Ver comentarios, Finalizar → PDF

#### 2f. Ruta en `App.tsx`
```tsx
<Route path="/contract-draft/:token" element={<ContractDraftView />} />
```
Ruta pública (sin `ProtectedRoute`)

### Fase 3: Flujo de estados

```text
BORRADOR ──→ EN NEGOCIACIÓN ──→ LISTO PARA FIRMA ──→ FIRMADO
   │              │                     │                │
   │         Link compartido       Banner verde      PDF final
   │         Comentarios activos   "Convertir a PDF"  Bloqueado
   │         Edición libre                            Solo fecha/lugar
   └──────────────────────────────────────────────────────┘
                    (puede volver a borrador)
```

- **Borrador → En negociación**: automático al compartir el link
- **En negociación → Listo para firma**: botón manual del creador
- **Listo para firma → Firmado**: al generar PDF final y guardarlo
- **Firmado**: Solo editable `firma_fecha` y `firma_lugar`

### Archivos a crear
1. `src/hooks/useContractDrafts.ts` — hook CRUD + Realtime
2. `src/pages/ContractDraftView.tsx` — vista pública del borrador
3. `src/components/contract-drafts/DraftStatusBanner.tsx` — banner de estado
4. `src/components/contract-drafts/DraftCommentsSidebar.tsx` — sidebar comentarios
5. `src/components/contract-drafts/DraftsList.tsx` — lista de borradores

### Archivos a modificar
1. `src/components/IPLicenseGenerator.tsx` — botón borrador, carga draft
2. `src/components/ContractGenerator.tsx` — mismo patrón
3. `src/pages/Documents.tsx` — sección borradores
4. `src/pages/release-sections/ReleaseContratos.tsx` — sección borradores
5. `src/App.tsx` — nueva ruta pública

### Tecnología
- **Realtime**: Supabase Realtime (ya usado en el proyecto para `channel_messages`)
- **Comentarios**: tabla dedicada con threads via `parent_comment_id`
- **Links**: token hex de 48 chars generado en DB, URL pública sin auth requerido para lectura

