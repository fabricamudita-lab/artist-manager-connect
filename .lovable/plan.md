

## Plan: Unificar el sistema de contratos en una arquitectura unica

### Problema actual

Hay **4 tablas de documentos separadas** con esquemas distintos, lo que genera duplicacion y divergencia:

| Tabla | Uso | Tiene firmas | Tiene negociacion |
|-------|-----|-------------|-------------------|
| `booking_documents` | Contratos de booking | Si (via `contract_signers`) | No |
| `release_documents` | Docs de lanzamiento | No | No |
| `documents` | Drive general | No | No |
| `contract_drafts` | Borradores negociables | No (tiene `signed_pdf_url`) | Si (via `contract_draft_comments`) |

Ademas, `contract_signers.document_id` apunta SOLO a `booking_documents`. Esto impide reusar el sistema de firmas para contratos IP o cualquier otro tipo.

### Arquitectura propuesta: Tabla unificada `contracts`

En vez de migrar todo de golpe (riesgo alto), la solucion es crear una **tabla puente `contracts`** que centralice el ciclo de vida de cualquier contrato, independientemente de su origen.

```text
┌─────────────────────────────────────────────────┐
│                   contracts                      │
│─────────────────────────────────────────────────│
│ id (uuid, PK)                                    │
│ contract_type: 'booking' | 'ip_license' | ...   │
│ title: text                                      │
│ status: draft | negotiating | ready | signed     │
│ draft_id: uuid? → contract_drafts.id             │
│ booking_document_id: uuid? → booking_documents   │
│ release_document_id: uuid? → release_documents   │
│ file_url: text?  (PDF final firmado)             │
│ created_by: uuid → auth.users                    │
│ booking_id: uuid? → booking_offers               │
│ release_id: uuid? → releases                     │
│ artist_id: uuid? → artists                       │
│ created_at, updated_at                           │
└─────────────────────────────────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────────────────────────────────┐
│              contract_signers                    │
│─────────────────────────────────────────────────│
│ document_id → contracts.id  (cambiar FK)         │
│ ... (resto igual)                                │
└─────────────────────────────────────────────────┘
```

### Fases de implementacion

**Fase 1: Redirigir `contract_signers` para aceptar cualquier contrato**

1. Crear tabla `contracts` con los campos arriba descritos
2. Cambiar la FK de `contract_signers.document_id` para que apunte a `contracts.id` en vez de solo `booking_documents.id`
3. Migrar los booking_documents existentes que tienen firmantes a la nueva tabla `contracts`
4. Actualizar `SignContractMulti.tsx` para buscar el documento en `contracts` en vez de hardcodear `booking_documents`

**Fase 2: Integrar el ciclo completo para IP License**

1. Cuando un `contract_draft` de tipo `ip_license` pasa a estado `listo_para_firma`, crear automaticamente un registro en `contracts`
2. Reusar `ContractSignersManager` y `ContractSignersSummary` tal cual (ya reciben `documentId` generico)
3. Reusar `SignContractMulti` para la firma publica
4. Añadir la seccion de firmantes en `ReleaseContratos.tsx` (mismos componentes que booking)

**Fase 3: Flujo unificado de estados**

1. `draft` → Se negocia via `contract_drafts` + `contract_draft_comments`
2. `ready_to_sign` → Se crean firmantes en `contract_signers`, se envian links
3. `signed` → Todas las partes firmaron, se genera PDF final y se guarda en `contracts.file_url`

### Componentes reutilizables (ya existen, no hay que duplicar)

- `ContractSignersManager` — gestion de firmantes (anadir/eliminar)
- `ContractSignersSummary` — badge "X/Y firmados"
- `ContractSignaturesFooter` — bloque de firmas en el PDF
- `SignContractMulti` — pagina publica de firma
- `DraftCommentsSidebar` — negociacion colaborativa
- `ContractDraftView` — vista publica del borrador

### Cambios en base de datos (migracion SQL)

1. **Crear tabla `contracts`** con campos genericos + FK opcionales a booking/release/draft
2. **Alterar `contract_signers`** para cambiar la FK de `booking_documents` a `contracts`
3. **Migrar datos existentes**: INSERT INTO contracts SELECT... FROM booking_documents WHERE tiene firmantes
4. **RLS**: Policies para owner + public read via token

### Archivos a modificar

1. **Nueva migracion SQL** — crear tabla, alterar FK, migrar datos
2. **`src/pages/SignContractMulti.tsx`** — buscar en `contracts` en vez de `booking_documents`
3. **`src/components/booking-detail/BookingDocumentsTab.tsx`** — al generar contrato, crear tambien en `contracts`
4. **`src/pages/release-sections/ReleaseContratos.tsx`** — anadir componentes de firmantes
5. **`src/pages/ContractDraftView.tsx`** — boton "Enviar a firma" crea registro en `contracts`
6. **`src/hooks/useContractDrafts.ts`** — funcion para transicionar draft → contracts
7. **`src/integrations/supabase/types.ts`** — se regenerara automaticamente

### Beneficios

- Un solo sistema de firmas para todos los tipos de contrato
- Los componentes de UI se reusan sin modificacion
- Nuevos tipos de contrato (sync, distribucion, etc.) se integran anadiendo un valor al enum `contract_type`
- El flujo completo (generacion → negociacion → firma → archivo) es identico para todos

