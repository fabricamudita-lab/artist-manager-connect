

## Plan: Botón "Eliminar contacto" con doble verificación + bloqueo si está vinculado

### Análisis del impacto en BD
La tabla `contacts` está referenciada desde múltiples tablas. Hay dos comportamientos:

**Bloqueantes (perderían información crítica si se borra):**
| Tabla | FK | Acción al borrar |
|---|---|---|
| `budget_items` | `contact_id` ON DELETE SET NULL | Pierde proveedor del presupuesto |
| `bookings.promotor_contact_id` | SET NULL | Pierde promotor del concierto |
| `track_publishing_splits.contact_id` | SET NULL | Pierde split de publishing/royalties |
| `track_master_splits.contact_id` | SET NULL | Pierde split de master |
| `song_splits.contact_id` | (sin acción) | Pierde split |
| `cobros / pagos.contact_id` | SET NULL | Pierde proveedor/cliente del cashflow |
| `solicitudes.contact_id`, `requester_contact_id` | SET NULL | Pierde solicitante |
| `project_team.contact_id` | SET NULL | Pierde miembro del equipo |
| `contracts / contract_drafts` (signers) | SET NULL | Pierde firmante de contrato |

**Cascada segura (se borra con el contacto):**
| Tabla | FK |
|---|---|
| `contact_form_tokens` | CASCADE |
| `contact_tags` y similares JSON personales | CASCADE |

### Estrategia: bloqueo con conteo
Antes de permitir el borrado, contar referencias en las tablas críticas. Si el contacto está vinculado a **cualquier** entidad, **no se permite borrar** — se muestra el detalle con enlaces y la sugerencia: "Desvincúlalo primero o archívalo".

### Cambios

**1. Edge Function nueva: `check-contact-references`**
- Input: `{ contact_id }`
- Recorre todas las tablas críticas y devuelve:
  ```json
  {
    "total": 7,
    "breakdown": {
      "budgets": 2, "bookings": 1, "splits_publishing": 1,
      "splits_master": 0, "cobros": 2, "pagos": 0,
      "solicitudes": 1, "project_team": 0, "contracts": 0
    },
    "examples": [{ "type": "budget", "id": "...", "name": "..." }]
  }
- Usa `verify_jwt = true` (es operación sensible).

**2. Edge Function nueva: `delete-contact`**
- Input: `{ contact_id, confirmation_text }`
- Valida que `confirmation_text` coincide con el nombre del contacto (segunda verificación).
- Re-comprueba referencias server-side. Si `total > 0` → 409 Conflict.
- Si OK → `DELETE FROM contacts WHERE id = ...` (CASCADE limpia tokens, tags).
- Solo usuarios autenticados con permiso de gestión.

**3. UI en `EditContactDialog.tsx`**
- Nueva sección "Zona de peligro" al final del formulario (separada visualmente, borde rojo sutil), con botón **"Eliminar contacto"** (variant destructive).
- Click → abre `AlertDialog` de confirmación:
  - **Paso 1**: Llamada a `check-contact-references`. 
    - Si hay referencias → diálogo muestra desglose ("Este contacto está vinculado a 2 presupuestos, 1 booking, etc.") con CTA **"Entendido"** y opcional **"Ver detalles"** (lista los `examples`). **No deja borrar**. Sugerencia: "Desvincula primero estas referencias desde los módulos correspondientes."
    - Si no hay referencias → pasa al paso 2.
  - **Paso 2** (doble verificación): Input que pide escribir el nombre exacto del contacto + warning final. Botón "Eliminar definitivamente" deshabilitado hasta que el texto coincida.
- Tras éxito → toast con `undoableDelete` no aplica (borrado real, irreversible) → toast simple "Contacto eliminado" + cierra diálogo + llama `onContactUpdated()` para refrescar.

**4. Integración con sistemas existentes**
- **Auth**: ambas Edge Functions validan JWT; las RLS de `contacts` ya garantizan que el usuario solo ve sus contactos del workspace.
- **Panel lateral / ContactProfileSheet**: no se toca, el borrado es solo desde el modal "Configuración" (`EditContactDialog`), consistente con el patrón "todo se edita desde Configuración".
- **Undo global**: NO aplica — el borrado de contacto es destructivo y solo se permite cuando no hay referencias. Sería peligroso revertir y dejar referencias huérfanas.

### Resultado
- Botón claro y aislado en zona de peligro.
- Doble verificación: conteo de referencias + escribir el nombre exacto.
- Imposible borrar un contacto vinculado a presupuestos, bookings, contratos, splits, cashflow, solicitudes o equipos de proyecto.
- Sin migración de BD: las FK existentes (CASCADE/SET NULL) se respetan, solo se añade la lógica de bloqueo en el cliente vía Edge Function.

