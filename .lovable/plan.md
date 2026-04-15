

## Plan: Agrupar créditos por persona en la UI

### Problema actual
Cada fila en `track_credits` es 1 persona + 1 rol. Si "Vicente López" tiene roles de Arreglista y Compositor, aparece como dos filas separadas. Esto confunde al usuario y cuando va a añadir un crédito, la misma persona vuelve a aparecer como disponible aunque ya tenga otros roles asignados.

### Estrategia: Agrupacion visual (sin cambiar la BD)

El modelo actual de BD (1 fila = 1 persona + 1 rol) es correcto y granular. Cambiarlo a un array de roles rompería royalties, label copy export, splits, solicitudes, y mucho mas. La solucion es **agrupar en el frontend**.

```text
ANTES (actual):                     DESPUES (propuesto):
┌─────────────────────────┐         ┌──────────────────────────────────┐
│ Vicente López           │         │ Vicente López  ✓                 │
│ Arreglista  [Autoría]   │         │ Arreglista · Compositor          │
│                 25% A   │         │ [Autoría]                        │
├─────────────────────────┤         │          25% A (Arr) · 50% A (C) │
│ Vicente López           │         └──────────────────────────────────┘
│ Compositor  [Compositor]│
│                 50% A   │
└─────────────────────────┘
```

### Cambios en `ReleaseCreditos.tsx`

**1. Nuevo tipo `GroupedCredit`**
```ts
interface GroupedCredit {
  key: string;              // contact_id || name.toLowerCase()
  name: string;
  contact_id: string | null;
  artist_id: string | null;
  credits: TrackCredit[];   // todas las filas de esta persona
  categories: Set<CreditCategory>;
}
```

**2. Agrupacion en `CreditsSection`**
- En `creditsByCategory`, antes de renderizar, agrupar los créditos por persona (clave: `contact_id` si existe, sino `name.toLowerCase()`)
- Cada persona aparece UNA vez en la categoría donde tiene su primer rol. Si tiene roles en multiples categorías, aparece en cada una pero con indicador de que tiene roles cruzados.
- Alternativa mas simple: agrupar por persona DENTRO de cada categoría (si tiene 2 roles en "Autoría", se muestran como 1 fila con 2 badges de rol)

**3. `SortableCreditRow` → `SortablePersonRow`**
- Recibe `GroupedCredit` en vez de `TrackCredit`
- Muestra todos los roles como badges
- Muestra los porcentajes por rol (ej: "25% A (Arreglista) · 50% A (Compositor)")
- El drag-and-drop mueve todas las filas de esa persona juntas
- Editar abre un formulario donde se pueden gestionar los roles individuales
- Eliminar elimina TODAS las filas de la persona (con confirmacion)
- Boton para añadir un rol adicional a la misma persona

**4. `AddCreditWithProfileForm`**
- Al seleccionar una persona que YA tiene créditos en la cancion, filtrar los roles que ya tiene para no duplicar
- Mostrar un indicador "Ya tiene: Arreglista, Compositor" para informar al usuario

**5. Manejo de categorías cruzadas**
- Si "Vicente López" es Arreglista (Autoría) y Guitarrista (Intérprete), aparecerá en AMBAS secciones de categoría
- Cada aparicion muestra solo los roles de ESA categoría, pero un badge pequeño indica "también en: Intérprete"

### Impacto en otros sistemas (analisis de riesgos)

| Sistema | Impacto | Riesgo |
|---------|---------|--------|
| `TrackRightsSplitsManager` | Ninguno — lee `track_credits` directamente, cada fila sigue teniendo su % | Nulo |
| `exportLabelCopyPDF` | Ninguno — itera sobre filas individuales | Nulo |
| `useRoyalties` | Ninguno — calcula sobre filas individuales | Nulo |
| `CreditedArtistRoles` | Ninguno — ya agrupa por persona con `creditedPeople` | Nulo |
| `SolicitudDetailsDialog` | Ninguno — muestra créditos planos | Nulo |
| `ReleaseAudio` | Ninguno — ya agrupa por nombre en línea 777 | Nulo |
| Drag-and-drop ordering | Medio — al agrupar, `sort_order` debe sincronizarse para todas las filas de la misma persona | Bajo |

### Archivos a modificar

1. **`src/pages/release-sections/ReleaseCreditos.tsx`**:
   - Nuevo tipo `GroupedCredit`
   - Logica de agrupacion en `CreditsSection`
   - Nuevo componente `SortablePersonRow` (reemplaza a `SortableCreditRow`)
   - Edicion inline adaptada para multiples roles
   - Eliminacion en cascada de todas las filas de una persona

2. **`src/components/credits/AddCreditWithProfileForm.tsx`**:
   - Recibir prop `existingCredits` para filtrar roles ya asignados
   - Mostrar indicador de roles existentes

### Sin cambios en base de datos

La tabla `track_credits` permanece igual. Un registro = una persona + un rol + sus porcentajes. La agrupacion es puramente visual.

