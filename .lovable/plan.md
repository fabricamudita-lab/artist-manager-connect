
# Mejoras al formulario de presupuesto de lanzamiento

## Problema detectado

1. **Territorio objetivo**: Solo muestra 4 opciones regionales (Espana, Latinoamerica, Europa, Global). Deberia ser un selector multi-seleccion con todos los paises y regiones relevantes del mercado musical.

2. **Sello, Distribucion y Owner interno**: Son inputs de texto libre. Deberian vincularse a perfiles/contactos existentes usando el patron `BudgetContactSelector` (buscar o crear), etiquetando automaticamente los nuevos contactos como "sello", "distribucion" u "owner".

3. **Prioridad**: No tiene sentido como Alta/Media/Baja. Se reemplaza por un selector multi-seleccion de **Servicios contratados** que clasifique que servicios incluye este presupuesto (ej: Grabacion, Mezcla, Master, Videoclip, PR, RRSS, etc.).

## Cambios en `CreateReleaseBudgetDialog.tsx`

### A) Territorio objetivo -> Multi-select de paises/regiones

- Reemplazar el `Select` simple por un selector multi-seleccion (checkboxes dentro de un Popover/Command).
- Opciones organizadas por region:
  - **Global**
  - **Europa**: Espana, Francia, Alemania, Italia, Reino Unido, Portugal, Paises Bajos, Belgica, Suecia, Noruega, Suiza, Austria, Polonia, etc.
  - **Latinoamerica**: Mexico, Argentina, Colombia, Chile, Peru, Ecuador, Uruguay, Brasil, etc.
  - **Norteamerica**: Estados Unidos, Canada
  - **Asia-Pacifico**: Japon, Corea del Sur, Australia, etc.
  - **Africa y Oriente Medio**: Marruecos, Sudafrica, EAU, etc.
- Estado: cambia de `territory: string` a `territories: string[]`
- Se muestra como badges/pills con los paises seleccionados

### B) Sello, Distribucion, Owner interno -> `BudgetContactSelector`

- **Sello**: Reemplazar `Input` por `BudgetContactSelector` con `compact={true}`. Al crear un contacto nuevo, se etiqueta automaticamente con `category: 'sello'` y `role: 'Sello'`.
- **Distribucion**: Igual, con `category: 'distribucion'` y `role: 'Distribucion'`.
- **Owner interno**: Igual, con `role: 'Owner'`.
- Se almacena el `contact_id` (UUID) en el metadata en lugar de texto libre.
- Estado: `label` y `distribution` y `ownerInterno` pasan de `string` a `string` (contact_id UUID).

### C) Prioridad -> Servicios (multi-select)

- Eliminar el campo "Prioridad" (Alta/Media/Baja).
- Reemplazarlo por **"Servicios"**: un selector multi-seleccion con opciones como:
  - Grabacion
  - Mezcla
  - Mastering
  - Videoclip
  - Shooting
  - PR Nacional
  - PR Internacional
  - RRSS / Contenidos
  - Diseno grafico
  - Distribucion
  - Fabricacion fisica
  - Stage / Residencia
  - Evento de lanzamiento
- Se almacena como `services: string[]` en el metadata.
- Se muestran como badges debajo del selector.

## Detalle tecnico

### Archivo modificado: `src/components/releases/CreateReleaseBudgetDialog.tsx`

Cambios de estado:
```text
// Antes
territory: string ('ES')
label: string
distribution: string
ownerInterno: string
priority: string ('media')

// Despues
territories: string[] (['ES'])
labelContactId: string (UUID)
distributionContactId: string (UUID)
ownerContactId: string (UUID)
services: string[] ([])
```

Cambios en la UI (seccion metadata, lineas ~536-593):
- Territorio: reemplazar Select por Popover con Command + checkboxes agrupados por region
- Sello/Distribucion/Owner: reemplazar Input por 3 instancias de `BudgetContactSelector compact`
- Prioridad: eliminar y reemplazar por multi-select de servicios

Cambios en el metadata guardado (lineas ~221-250):
- `territory` -> `territories`
- `label_contact_id`, `distribution_contact_id`, `owner_contact_id` (UUIDs)
- `priority` eliminado, `services` anadido

### Sin cambios en base de datos
Todo se almacena en la columna `metadata` (JSONB) que ya existe.
