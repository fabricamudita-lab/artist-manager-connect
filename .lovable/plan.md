## Diagnóstico: la "ficha" ya existe — el problema es de referencia

Tras inspeccionar la base de datos, la ficha de Eudald que rellenó por el formulario público **ya está completa en la tabla `artists`**:

```
artists.id = d8cc3ba2-a8c7-417d-b185-e7756b1b663a
  artist_type   = roster
  name          = Eudald Payés Roma
  stage_name    = Eudald Payés
  email         = eudaldpayes@gmail.com
  phone         = 654778063
  nif           = 77622002S
  tipo_entidad  = persona_fisica
  iban          = ES18 2100 0384 3501 0090 1145
  bank_name     = CaixaBank
  swift_code    = CAIXESBBXXX
  profile_id    = NULL  (sin cuenta de usuario aún)
```

Y existe **en paralelo** un registro sombra en `contacts` (creado al añadir a Eudald como compositor en los créditos del release):

```
contacts.id = 29d565fb-34c4-44d8-a9da-aa3ad660a765
  name           = Eudald Payés
  role           = "Compositor, Productor"
  field_config   = { is_team_member: true, team_categories: [compositor] }
  email/iban/nif = vacíos
```

Este contacto **no contiene datos fiscales propios** (sólo el rol de equipo) y, por suerte, ningún módulo de finanzas/contratos lo consulta para extraer IBAN/NIF (la búsqueda en código confirma que esos campos sólo se leen desde `artists`).

Por tanto, no hay datos que migrar. Lo que hay que hacer es:

1. **Garantizar la fuente única de verdad**: declarar formalmente que para todo artista del roster, `artists` es la base de datos autoritativa de su ficha.
2. **Vincular el contacto-sombra al artista** para que cualquier acción sobre ese contacto (editar nombre, rol, etc.) se propague a `artists` cuando proceda, y para que los módulos puedan resolver "este contacto = este artista" sin depender del matching por nombre que añadimos en la pantalla de Equipos.
3. **No romper auth ni el portal del artista**: `profile_id` sigue siendo `NULL`. El día que Eudald sea invitado y cree cuenta, `handle_new_user` creará su `profiles` row y luego se vinculará a `artists.profile_id` mediante el flujo existente de invitación. La ficha de `artists` **no debe duplicarse en `profiles`** (allí sólo van datos de la cuenta de usuario, no de identidad fiscal del artista).

## Plan

### 1. Vínculo formal contacto → artista (DB)

Migración SQL:

- Añadir columna `contacts.linked_artist_id uuid REFERENCES public.artists(id) ON DELETE SET NULL` con índice.
- Backfill: para cada contacto cuyo `name` o `stage_name` (normalizado) coincide con un `artist` del mismo `created_by`/`workspace_id`, asignar `linked_artist_id`. Esto incluye a Eudald.
- RLS: la política existente de `contacts` se mantiene; el FK no expone más datos.

### 2. Crear el contacto-sombra ya vinculado (código)

`src/pages/release-sections/ReleaseCreditos.tsx` — al crear/actualizar el contacto desde un crédito:

- Si el `name` coincide con un artista del workspace → `linked_artist_id = <artist.id>` y **no copiar** datos fiscales (esos viven en `artists`).
- Si después se intenta editar email/IBAN/NIF de un contacto con `linked_artist_id`, mostrar aviso "Este perfil pertenece al artista X — edita su ficha".

### 3. Refactor del matching de la pantalla Equipos

`src/pages/Teams.tsx` — el matching por nombre que añadimos en la iteración anterior pasa a usar `linked_artist_id` cuando exista (más preciso); el matching por nombre se mantiene como fallback para registros antiguos no migrados.

### 4. Edge function `update-artist-public` con validación Zod estricta

`supabase/functions/update-artist-public/index.ts` (nueva):

- Recibe `{ token, payload }`. Valida el token contra `artist_form_tokens` (activo, no expirado).
- Valida `payload` con Zod:
  - `name`, `stage_name`: `z.string().trim().min(1).max(120)`
  - `email`: `z.string().trim().email().max(255).optional()`
  - `phone`: `z.string().trim().regex(/^[+\d\s().-]{6,30}$/).optional()`
  - `nif`: `z.string().trim().regex(/^[A-Z0-9]{8,15}$/i).optional()`
  - `iban`: `z.string().trim().regex(/^[A-Z]{2}[0-9A-Z\s]{13,32}$/i).transform(s=>s.replace(/\s/g,'').toUpperCase()).optional()`
  - `swift_code`: `z.string().trim().regex(/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/i).optional()`
  - `bank_name`, `legal_name`, `company_name`, `address`, `notes`: `z.string().trim().max(500).optional()`
  - `irpf_porcentaje`: `z.coerce.number().min(0).max(50).optional()`
  - `tipo_entidad`: `z.enum(['persona_fisica','autonomo','sociedad'])`
  - URLs sociales: `z.string().url().max(500).optional()`
  - `custom_data`: `z.record(z.string().max(2000))` (limita tamaño de cada campo libre)
- Sanitiza strings (`.trim()` + recorte de caracteres de control) — el cliente Postgres ya parametriza queries (no hay SQL injection en consultas Supabase JS), pero el regex/length-cap previene payloads abusivos.
- XSS: no se renderiza HTML — siempre que el frontend siga usando React (auto-escape), las cadenas almacenadas son seguras. Como cinturón, rechazar payloads con `<script` en el servidor.
- Errores devueltos como `{ error: { code, message, field? } }` con HTTP 400/401/403/422. Sin `console.log` de payloads sensibles (solo `error.message`).
- Usa `service_role` internamente para escribir en `artists` (la tabla tiene RLS estricta y el formulario es público vía token).

### 5. Migrar `PublicArtistForm.tsx` para usar la edge function

Actualmente el formulario público escribe directamente con anon key. Lo redirigimos a la nueva edge function para centralizar validación.

### 6. Edge cases manejados

- Token inválido/expirado/desactivado → 401 con mensaje genérico.
- Artista borrado entre carga y guardado → 404.
- IBAN/NIF/SWIFT con formato no válido → 422 con `field` para resaltar el input.
- Carrera (dos guardados simultáneos) → último gana, pero loggeamos `updated_at` previo en metadata.
- Contacto-sombra existente con email/iban manual → no se sobreescribe (la unificación es one-way: artist → contact).

## Archivos

| Archivo | Cambio |
|---|---|
| Migración SQL (nueva) | `contacts.linked_artist_id` + índice + backfill |
| `supabase/functions/update-artist-public/index.ts` | Nueva edge function con Zod |
| `supabase/config.toml` | Registrar la function como `verify_jwt = false` |
| `src/pages/PublicArtistForm.tsx` | Llamar a la edge function en el submit |
| `src/pages/release-sections/ReleaseCreditos.tsx` | Asignar `linked_artist_id` al crear contactos desde créditos |
| `src/pages/Teams.tsx` | Usar `linked_artist_id` con fallback al matching por nombre |
| `src/components/EditContactDialog.tsx` | Mostrar aviso "vinculado al artista X" si aplica |

## Lo que NO se toca

- `profiles` y el sistema de auth: la ficha de Eudald no se copia a `profiles`. El día que tenga cuenta, `artists.profile_id` apuntará a su `profiles.id` (link, no copia).
- `ArtistInfoDialog` y la pantalla `/artist/:id`: ya leen/escriben en `artists`, sólo confirmamos que sigan siendo el único editor manual.
- RLS de `artists`: ya correcta — sólo workspace owners/managers pueden editar; el formulario público pasa por edge function con service_role.

## Resultado esperado

- La ficha de Eudald (NIF, IBAN, etc.) tiene **un solo lugar autoritativo**: `artists`.
- El contacto-sombra queda vinculado por FK, no por nombre.
- El formulario público está protegido por validación estricta server-side.
- Cualquier futura mención a Eudald (créditos, equipos, contratos, finanzas) resuelve a su artista del roster automáticamente.
