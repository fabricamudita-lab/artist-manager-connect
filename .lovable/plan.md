

## Vincular contacto desde la vista de Pagos (Cashflow)

### Problema
Los items "Sin contacto" en la pestaña Pagos no tienen forma de asociarse a un contacto existente sin ir al presupuesto original.

### Solución
Añadir un botón inline en cada item sin contacto que abra un selector de contactos (Popover con Select) para vincular directamente desde la vista de Pagos. El selector mostrará contactos de la agenda general, priorizando los del equipo del artista asociado al presupuesto.

### Cambios en `CashflowView.tsx`

**1. Ampliar `CashflowItem` con `contactId` y `artistId`**
- Incluir `contact_id` en la query de `budget_items` para poder hacer el update.
- Incluir `artistId` del presupuesto para filtrar contactos del equipo.

**2. Botón "Vincular contacto" por fila**
- Donde actualmente no hay `contactName`, mostrar un botón con icono `UserPlus` y texto "Vincular".
- Al pulsar, abrir un `Popover` con un `Select` que liste contactos.

**3. Selector de contactos inteligente**
- Hacer una query a `contacts` ordenada por nombre.
- Opcionalmente, hacer query a `contact_artist_assignments` para el `artistId` del item, y mostrar primero los contactos del equipo del artista con un separador visual ("Equipo de [Artista]" / "Otros contactos").

**4. Guardar vinculación**
- Al seleccionar un contacto, hacer `supabase.from('budget_items').update({ contact_id }).eq('id', itemId)`.
- Actualizar el estado local para reflejar el cambio sin recargar.
- Toast de confirmación.

### Flujo visual

```text
[Tècnic de so]
  Pressupost Ultramar  Klaus Stroink
  [🔗 Vincular contacto]          Base: €300 + IVA €63
                                   A transferir: €318
  
  Click → Popover:
  ┌──────────────────────────┐
  │ 🔍 Buscar contacto...    │
  │ ── Equipo de Klaus ──    │
  │  Juan (Técnico)          │
  │  María (Banda)           │
  │ ── Otros contactos ──    │
  │  Pedro García            │
  │  Ana López               │
  └──────────────────────────┘
  
  Seleccionar → Update DB → Muestra "→ Juan" inline
```

### Archivos modificados
- `src/components/finanzas/CashflowView.tsx`

