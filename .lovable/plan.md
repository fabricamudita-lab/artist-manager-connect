

## Análisis

El usuario pide que la deduplicación de contactos sea **inteligente** y detecte casos como:
- "Lecuala" y "Lecuala Films" → misma empresa (uno contiene al otro)
- "Leyre" y "Leyre Estruch" → misma persona (nombre corto vs nombre completo)

La función actual `deduplicateContacts.ts` solo agrupa por **igualdad exacta** del nombre normalizado (`name.trim().toLowerCase()`), por eso no detecta estos casos.

## Exploración

Ya tengo `src/lib/deduplicateContacts.ts` en contexto. Veo que:
- Agrupa con `Map<string, contacts>` usando key = nombre normalizado.
- Fusiona automáticamente sin pedir confirmación.

Necesito revisar dónde se invoca esta función (probablemente con un botón "Deduplicar" en `/agenda`) para añadir un paso de confirmación de los casos "sospechosos".
<lov-tool-use id="toolu_vrtx_012yRrxFHwdyrXAjg57o9Dak" name="code--search_files" integration-id="code" data="{\"query\": \"deduplicateContacts\", \"include_patterns\": \"*.tsx,*.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01R4UKK8vdmjPaNhN3o9EcHL" name="code--search_files" integration-id="code" data="{\"query\": \"deduplicateContacts\", \"include_patterns\": \"*.ts,*.tsx\"}">
</lov-tool-use>
<lov-plan>

## Análisis

Hoy `deduplicateContacts.ts` solo agrupa por **nombre exacto normalizado** (`name.trim().toLowerCase()`). Por eso "Lecuala" + "Lecuala Films" o "Leyre" + "Leyre Estruch" no se detectan: son strings distintos.

El usuario quiere que el botón "Deduplicar" **sugiera posibles coincidencias** cuando los nombres son similares (no idénticos), especialmente si son nombres poco comunes.

## Plan

### 1. Algoritmo de similitud
Añadir en `src/lib/contactSimilarity.ts`:
- Normalización (lowercase, sin tildes, sin sufijos comunes: `films`, `music`, `records`, `studio`, `productions`, `mgmt`, `oficial`, `official`).
- Tres reglas combinables:
  1. **Subset de tokens**: tokens(A) ⊂ tokens(B) → match (cubre "Leyre" ⊂ "Leyre Estruch", "Lecuala" ⊂ "Lecuala Films").
  2. **Levenshtein** sobre el primer token con umbral ≤2 para errores tipográficos.
  3. **Rareza del nombre**: si el primer token aparece <3 veces en la base del usuario, baja el umbral (más permisivo); si es muy común (María, José, Juan…) se exige coincidencia más fuerte. Lista corta de nombres comunes hardcodeada.
- Devuelve `score` 0-1 + razón legible ("Mismo primer nombre", "Nombre contenido en…", "Tipográfica").

### 2. Cambio de flujo: de auto-merge a sugerencias
Hoy el botón fusiona directamente todo. Nuevo comportamiento:
- **Exactos**: se siguen fusionando automáticamente como ahora (sin fricción).
- **Similares (score ≥ umbral)**: NO se fusionan; se devuelven como `suggestions: { primary, candidate, score, reason }[]`.

### 3. UI: diálogo de revisión `DeduplicationReviewDialog`
Tras pulsar "Deduplicar":
- Toast con resultado de los exactos ("X fusionados automáticamente").
- Si hay sugerencias → abrir diálogo modal mostrando pares lado a lado:
  - Avatar + nombre + categoría + email + nº de track credits / proyectos asociados (para ayudar a decidir).
  - Razón de la sugerencia ("Lecuala está contenido en Lecuala Films").
  - Botones por par: **Fusionar** / **Mantener separados** / **Saltar**.
  - Selector de cuál es el "principal" (por defecto el más antiguo o con más datos).
- "Mantener separados" guarda la decisión en una nueva tabla `contact_dedup_dismissals` (`workspace_id`, `contact_id_a`, `contact_id_b`, `dismissed_by`, `created_at`) para no volver a sugerirlo.

### 4. Reutilizar lógica de merge existente
La función actual ya hace merge correcto (track_credits, artist_assignments, group_members, team_categories). Refactor mínimo:
- Extraer `mergePairOfContacts(primaryId, duplicateId)` reutilizable.
- `deduplicateContacts()` la usa para exactos y el diálogo la invoca por par tras confirmación.

### 5. Cambios resumidos

| Archivo | Cambio |
|---|---|
| `src/lib/contactSimilarity.ts` | nuevo: normalización + scoring |
| `src/lib/deduplicateContacts.ts` | refactor: separar merge unitario; devolver `{ merged, deleted, suggestions }` |
| `src/components/contacts/DeduplicationReviewDialog.tsx` | nuevo: UI revisión por pares |
| `src/pages/Agenda.tsx` | conectar diálogo tras la llamada |
| Migración DB | tabla `contact_dedup_dismissals` con RLS por workspace/created_by |

Sin tocar auth. Validación Zod no necesaria (entradas internas). Sin paginación (volumen pequeño).

