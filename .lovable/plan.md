## Problema

El aviso actual ("puede afectar a metadatos enviados a distribución") es demasiado vago. El usuario no sabe:
1. Qué metadatos cambian exactamente.
2. Qué consecuencias reales tiene en distribución, contratos, splits, pitches o licencias.
3. Cuándo es seguro hacerlo y cuándo no.

Además, si hay **contratos firmados** (licencias IP, splits firmados) que referencian un track con su número de pista, renumerar/reordenar puede invalidar esos documentos.

## Solución

### 1. Detección de bloqueos reales (capa de datos)

Crear `src/lib/releases/trackOrderingGuards.ts` con una función pura `getReorderImpact(releaseId)` que devuelve un informe estructurado:

```ts
type ReorderImpact = {
  blocked: boolean;          // hay firmas; bloqueamos por defecto
  signedContracts: number;   // contract_drafts.status = 'signed' que referencian tracks del release
  signedLicenses: number;    // ip_licenses firmadas vinculadas a tracks
  pitches: number;           // pitches con track_id apuntando a tracks del release
  publishedToDistro: boolean;// release.status = 'released' o distribución enviada
  details: { trackId: string; title: string; refs: string[] }[];
};
```

- Validación Zod del `releaseId` (UUID).
- Consulta paginada (bloques de 1000) sobre `tracks`, `contract_drafts`/`signed_contracts`, `ip_licenses`, `pitches` filtrando por `release_id` o `track_id IN (...)`.
- Solo lectura, parametrizada (sin SQL concat → sin inyección).
- Idempotente y testeable; la UI no toca Supabase directamente para esto.

### 2. Política de bloqueo

- **Bloqueo duro** (botón Renumerar/Cambiar orden deshabilitado, con tooltip explicativo): si `signedContracts > 0` o `signedLicenses > 0`. Razón: esos documentos citan número de pista y artista; cambiarlos rompe la trazabilidad legal.
- **Aviso fuerte (permitido tras confirmación explícita)**: si `release.status = 'released'` o hay pitches asociados. Es reversible.
- **Sin aviso**: si nada de lo anterior aplica.

### 3. UI: aviso claro con "Ver más"

En `ReleaseCreditos.tsx`:

- Sustituir el `Alert` ámbar y el texto del `AlertDialog` de Renumerar por un componente nuevo `<ReorderImpactNotice impact={impact} />` que muestra:
  - Resumen de una línea: *"Hay 2 contratos firmados que citan números de pista. No se puede renumerar."* o *"Lanzamiento publicado: la renumeración puede afectar a metadatos enviados a distribución."*
  - Botón **"Ver más"** que abre un `Collapsible` (o `Dialog` si la lista es larga) con:
    - Qué metadatos cambian: `track_number` en la BD; afecta a la portada de distribución (orden), tracklist en pitches enviados, créditos en contratos generados, splits exportados, ficheros DDEX/CSV ya generados.
    - Qué NO cambia: ISRC, título, audio, derechos.
    - Lista de elementos vinculados: contratos firmados (con enlace), licencias IP, pitches, distribuidoras notificadas.
    - Recomendación: *"Si el lanzamiento ya está en tiendas, contacta a tu distribuidora para reenviar el tracklist actualizado."*
- Si `impact.blocked`: el botón Renumerar y la entrada al modo "Cambiar orden" quedan deshabilitados con tooltip explicando el motivo y enlazando al contrato bloqueante.
- Si no está bloqueado pero hay impacto: el `AlertDialog` requiere checkbox *"Entiendo las consecuencias"* antes de habilitar el botón final.

### 4. Separación de capas

- **Datos** (`trackOrderingGuards.ts`, `trackOrdering.ts`): puro TypeScript + Supabase, validado con Zod, paginado.
- **Hook** (`useReorderImpact(releaseId)`): React Query, cacheado por release.
- **UI** (`ReleaseCreditos.tsx`, `ReorderImpactNotice.tsx`): solo presentación; recibe el impacto como prop.

Esto permite reusar el guard desde otras pantallas (p.ej. acción "Eliminar track") y cambiar la fuente de datos sin tocar la UI.

### 5. Compatibilidad con auth y panel de usuario

- No se cambian roles ni permisos. La consulta respeta RLS existente: el usuario solo ve contratos/pitches a los que ya tiene acceso, así que el conteo de bloqueo es coherente con su contexto.
- No se introducen rutas nuevas, no se toca `useAuth` ni el sidebar.

### 6. Edge cases cubiertos

- Release sin tracks → no se muestran botones (ya existente).
- Release con tracks pero sin contratos/pitches → comportamiento actual sin avisos.
- Tracks borrados con `undoableDelete` pendiente → el guard ignora tracks no presentes; la renumeración usa `loadAllTracks` ya paginado.
- Fallo de red al cargar el impacto → botones deshabilitados con mensaje *"No se ha podido verificar el impacto"* y opción de reintentar (no permitir acción ciega).
- Race condition: si entre cargar el impacto y confirmar aparece un nuevo contrato firmado, el guard se vuelve a ejecutar justo antes de `renumberTracks`/`reorderTracks` y aborta si `blocked` cambió a `true`.

## Archivos a tocar

- **Crear** `src/lib/releases/trackOrderingGuards.ts` — lógica pura de detección de impacto, Zod, paginación.
- **Crear** `src/hooks/useReorderImpact.ts` — wrapper React Query.
- **Crear** `src/components/releases/ReorderImpactNotice.tsx` — UI del aviso con "Ver más".
- **Editar** `src/pages/release-sections/ReleaseCreditos.tsx`:
  - Consumir `useReorderImpact`.
  - Reemplazar los dos avisos ámbar y el `AlertDialog` de Renumerar por el nuevo componente + checkbox de confirmación.
  - Deshabilitar botones cuando `impact.blocked`.
  - Re-validar el impacto en el handler antes de ejecutar.

No se requieren migraciones de BD ni cambios en RLS.

## Resultado para el usuario

- Si tiene contratos firmados que citan tracks: ve **"No se puede renumerar: 2 contratos firmados dependen del orden actual"**, botón "Ver más" lista cuáles, y los botones quedan deshabilitados.
- Si solo está publicado: ve un aviso claro con "Ver más" que explica exactamente qué metadatos cambian, qué hacer con la distribuidora, y debe marcar el checkbox para continuar.
- Si nada está en riesgo: experiencia actual sin fricción.