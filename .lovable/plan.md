

## Plan: Mejoras integrales del panel de comentarios + tracking de participantes

### 1. Panel lateral redimensionable y expandible
**Archivos**: `src/pages/ContractDraftView.tsx`

- Reemplazar el ancho fijo `w-80` por un panel con resize handle:
  - Estado `sidebarWidth` (default 360px, min 280px, max 720px), persistido en `localStorage`.
  - Drag-handle vertical en el borde izquierdo del sidebar (`onMouseDown` → listeners en `window`).
  - Botón "expandir/colapsar" con dos modos rápidos: estrecho (360px) ↔ ancho (640px).
- En móvil mantener `showSidebar` toggle a pantalla completa.

### 2. Propuestas en rojo dentro del documento
**Archivos**: `src/pages/ContractDraftView.tsx` (helpers `highlightText` / `LabeledHighlight`)

- Pasar también `proposalComments` (comentarios con `proposed_change` activo) a los helpers.
- Cuando un fragmento coincida con una propuesta, renderizar:
  - Texto original tachado en rojo (`text-decoration: line-through; color: #DC2626`).
  - A continuación, el `proposed_change` insertado en rojo subrayado (`color: #DC2626; text-decoration: underline; font-weight: 500`).
  - Tooltip "Propuesta de cambio – click para ver".
- Si la propuesta está aprobada por ambas partes, mostrar el texto nuevo en verde sin tachado (cambio aceptado).

### 3. Vista "todos los comentarios juntos" mejorada
**Archivos**: `src/components/contract-drafts/DraftCommentsSidebar.tsx`

- Añadir contador por filtro en los pills (`Todos (5) · Abiertos (3) · Pendientes (1) · Resueltos (1)`).
- Agrupar visualmente por cláusula (`§ reunidos`, `§ 1.1`, `§ 2.1`...) con headers sticky cuando filtro = "Todos".
- Densificar tarjetas en modo ancho: cuando `sidebarWidth > 480px`, mostrar 2 columnas tipo masonry.
- Añadir buscador rápido (input arriba) que filtra por texto del comentario o autor.

### 4. Tracking de participantes que han entrado al documento
**Nueva tabla** `contract_draft_participants`:
```
id uuid PK
draft_id uuid FK contract_drafts
name text
email text (lowercase)
profile_id uuid FK profiles NULLABLE  -- vinculado si email coincide con un perfil
contact_id uuid FK contacts NULLABLE  -- vinculado si email coincide con un contacto
role text  -- 'producer' | 'collaborator' | 'viewer'
first_seen_at timestamptz default now()
last_seen_at timestamptz default now()
view_count int default 1
UNIQUE (draft_id, email)
```

- RLS: select público para token holders (igual que `contract_drafts`), insert/update vía función `track_draft_participant(token, name, email)` (security definer).
- Al hacer `handleIdentitySubmit` en `ContractDraftView.tsx`, llamar al RPC para registrar/actualizar.
- Al cargar el draft también, refrescar `last_seen_at` (debounce 5min).

### 5. Vinculación con perfiles de la app
**Lógica de linking automático en el RPC**:

1. Buscar en `profiles` por email → si match, guardar `profile_id`.
2. Si no, buscar en `contacts` (campo email/emails JSONB) → guardar `contact_id`.
3. Devolver el participante enriquecido con avatar/nombre real del perfil.

**Resultado en UI**: cada participante muestra:
- Avatar (de profile/contact si existe, iniciales si no)
- Nombre + email
- Badge de rol detectado (Productora / Colaborador / Invitado)
- Badge "👤 Perfil de la app" si está vinculado, click → abre perfil en nueva pestaña

### 6. Nueva sección "Participantes" en el sidebar
**Archivo**: `src/components/contract-drafts/DraftParticipantsList.tsx` (nuevo)

- Pestaña/sección colapsable arriba del sidebar:
  ```
  👥 Participantes (3)
   ├ 🟢 Eudald Payés Roma · Productora · perfil app · ahora
   ├ 🟢 Davis Dolans · Colaborador · contacto app · hace 2h
   └ ⚪ David · Invitado · sin vincular · hace 1d
  ```
- Verde = activo en últimos 5min.
- Reactivo en tiempo real vía Supabase `realtime` sobre `contract_draft_participants`.

### Diagrama del layout final

```text
┌─────────────────────────────────────────┬──────────────────┐
│                                         │ 👥 Participantes │
│                                         │  (colapsable)    │
│         DOCUMENTO A4                    ├──────────────────┤
│  - Highlights amarillos (comentarios)   │ 💬 Comentarios   │
│  - Texto tachado rojo + nuevo rojo      │  Filtros + count │
│    (propuestas pendientes)              │  Buscador        │
│  - Texto verde (cambios aprobados)      │  Lista agrupada  │
│                                         │  por § cláusula  │
│                                         │  ─────────────   │
│                                         │  Nuevo comentario│
└─────────────────────────────────────────┴──────────────────┘
                                          ↑↔ resize handle
```

### Archivos
| Archivo | Cambio |
|---|---|
| `supabase/migrations/*` (nuevo) | Tabla `contract_draft_participants` + RPC `track_draft_participant` + RLS |
| `src/hooks/useDraftParticipants.ts` (nuevo) | Hook para listar/registrar participantes con realtime |
| `src/components/contract-drafts/DraftParticipantsList.tsx` (nuevo) | UI de participantes con avatares y vínculos |
| `src/components/contract-drafts/DraftCommentsSidebar.tsx` | Contadores por filtro, agrupación por cláusula, buscador, layout multi-columna |
| `src/pages/ContractDraftView.tsx` | Sidebar redimensionable, integración participantes, tracking en identity submit, render de propuestas en rojo |

