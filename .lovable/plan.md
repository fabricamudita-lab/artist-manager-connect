## Diagnóstico

Lo que ves no es un bug nuevo: en Fase 1 dejé conscientemente fuera estas tablas para no mezclar fases. Ya verificado en BD:

- `sync_offers` → `SELECT USING (true)` → cualquier autenticado ve TODAS las syncs.
- `solicitudes` → `auth.role()='authenticated'` → todas visibles.
- `contacts` → `auth.role()='authenticated'` → todos visibles.

Las tres tablas tienen `artist_id` y `created_by`, así que encajan limpiamente en el mismo modelo `user_can_see_artist` que ya construimos.

## Fase 1.5 (mini-cierre antes de saltar a Fase 2)

### Política nueva por tabla

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `sync_offers` | `artist_id IS NULL ? created_by=auth.uid() : user_can_see_artist(uid, artist_id)` | `created_by=auth.uid()` AND (artist_id IS NULL OR `user_can_edit_artist`) | `user_can_edit_artist` o creador | `user_can_edit_artist` o creador |
| `sync_splits` | hereda de `sync_offers` (ya OK, lo dejo) | igual | igual | igual |
| `solicitudes` | `artist_id IS NULL ? created_by=uid : user_can_see_artist(uid, artist_id)` | `created_by=auth.uid()` | `user_can_edit_artist` o creador | `user_can_edit_artist` o creador |
| `contacts` | `created_by=uid OR (artist_id IS NOT NULL AND user_can_see_artist(uid, artist_id)) OR contacto compartido en mi workspace` | autenticado con `created_by=uid` | creador o `user_can_edit_artist` | creador o `user_can_edit_artist` |

**Notas de diseño:**
- Mantengo intactos los flujos públicos (form tokens, share tokens) que ya existen como políticas separadas.
- `sync_offers` también conserva el INSERT público "Anyone can create sync offers via public form" (lo necesita el formulario público).
- `contacts`: añado además visibilidad para contactos del **mismo workspace** que el usuario (un contacto creado por mi compañero de workspace no debería desaparecer). Esto se hace vía nueva función `user_can_see_contact` que comprueba (a) creador, (b) artist binding, (c) workspace compartido.

### Bootstrap de datos existentes
- `contacts` y `solicitudes` ya tienen `created_by` poblado en los registros antiguos → sin migración de datos necesaria.
- `sync_offers` igual.

### Lo que NO toco aquí (queda para Fase 2 completa)
`cobros`, `royalty_*`, `payment_*`, `contracts`/`contract_*`, `chat_*`, `channel_*`, `epk_*`, `release_assets/documents/milestones`, `storage_nodes`, `event_*`, `liquidaciones`, `quick_expenses`, `documents`, `legal_documents`, `production_companies`, `directors`, `songs`, `song_splits`, `automations`.

### Ficheros que tocaré
- 1 migración SQL: nueva función `user_can_see_contact`, DROP+CREATE políticas en `sync_offers`, `solicitudes`, `contacts`.
- Cero cambios de UI necesarios (los hooks ya hacen `select * from ...`, las RLS hacen el resto).

## Resultado tras aplicar
- `davidsolanscontact@gmail.com` deja de ver syncs/solicitudes/contactos que no son suyos ni de artistas donde tiene binding.
- David Solans (workspace OWNER) sigue viendo todo.
- Formularios públicos siguen funcionando.

¿Lo aplico?