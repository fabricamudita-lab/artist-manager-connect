
# Mejoras a Sello, Distribucion y Owner interno

## Problema actual

Los tres campos (Sello, Distribucion, Owner interno) usan el mismo `BudgetContactSelector` generico que muestra todos los contactos y artistas del roster. Esto no tiene sentido porque:

1. **Sello**: Deberia mostrar por defecto el sello vinculado al artista del release. No deberia mostrar artistas del roster como opciones de sello. Si no existe, debe permitir crear uno nuevo con la categoria "sello".
2. **Distribucion**: Mismo concepto. Normalmente el sello ya se encarga.
3. **Owner interno**: Solo deberia mostrar los contactos asignados al artista que tengan la categoria "management" o rol de owner.

## Solucion

En lugar de usar `BudgetContactSelector` (que es generico), se creara un selector especializado inline dentro de `CreateReleaseBudgetDialog.tsx` que filtre contactos segun el contexto.

### Cambios en `CreateReleaseBudgetDialog.tsx`

**1. Cargar datos del artista al abrir el dialogo:**
- Consultar `contact_artist_assignments` para obtener los contactos vinculados al artista del release.
- Filtrar por `category = 'sello'` para pre-seleccionar el sello por defecto.
- Filtrar por `category = 'management'` para las opciones de Owner interno.

**2. Campo Sello:**
- Al abrir, si el artista tiene un contacto con `category = 'sello'` asignado, pre-seleccionarlo automaticamente.
- Mostrar un selector (Popover + Command) con:
  - Los contactos del artista que sean de categoria "sello" primero.
  - Todos los contactos de la agenda con categoria "sello".
  - Opcion "Crear nuevo sello..." que crea un contacto con `category: 'sello'`, `role: 'Sello'` y lo vincula al artista via `contact_artist_assignments`.
- No mostrar artistas del roster.

**3. Campo Distribucion:**
- Mismo patron que Sello pero filtrando por contactos con `category` o `role` que contenga "distribucion".
- Opcion de crear nuevo contacto con `category: 'distribucion'`, `role: 'Distribución'`.

**4. Campo Owner interno:**
- Solo mostrar contactos vinculados al artista (via `contact_artist_assignments`) que tengan `category = 'management'`.
- No permitir crear nuevos, solo seleccionar de los existentes.

### Detalle tecnico

Se eliminaran las 3 instancias de `BudgetContactSelector` y se reemplazaran por selectores custom con la logica descrita.

Nuevos estados:
```text
// Datos cargados al abrir
artistContacts: Contact[]  // contactos asignados al artista
allLabelContacts: Contact[]  // todos los contactos con category 'sello'
allDistributionContacts: Contact[]  // todos con category 'distribucion'
```

Nuevo fetch en el `useEffect` de apertura:
```text
1. Query contact_artist_assignments WHERE artist_id = release.artist_id
2. JOIN contacts para obtener nombre, category, role
3. Query contacts WHERE category IN ('sello', 'distribucion') para opciones globales
4. Pre-seleccionar sello si hay uno asignado al artista
```

Cada selector sera un Popover + Command con:
- Seccion "Vinculados al artista" (contactos asignados)
- Seccion "Otros" (contactos globales de esa categoria)
- Opcion "Crear nuevo..." (solo para Sello y Distribucion)
- Input para nombre al crear nuevo

No se modifica la base de datos. Todo usa tablas existentes (`contacts`, `contact_artist_assignments`).
