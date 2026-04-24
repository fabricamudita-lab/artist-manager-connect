## Objetivo

Convertir la tarjeta "Configuración de Campos" del diálogo `ArtistInfoDialog` en un panel colapsable, para que el usuario pueda ocultar la larga lista de switches con un clic y centrarse en el formulario del artista.

## Cambios

### `src/components/ArtistInfoDialog.tsx`

1. Añadir un estado local `const [configOpen, setConfigOpen] = useState(false)` (colapsado por defecto, ya que es muy largo y ocupa toda la columna izquierda).
2. Envolver la `Card` de "Configuración de Campos" (líneas 363–424) con el componente `Collapsible` de shadcn (`@/components/ui/collapsible`).
3. La cabecera (`CardHeader`) actuará como `CollapsibleTrigger`:
   - Cursor pointer en toda la fila.
   - Mostrar el título "Configuración de Campos" + un icono `ChevronDown` (de `lucide-react`) que rote 180º cuando esté abierto (`transition-transform`).
   - Layout flex `justify-between` para alinear título e icono.
4. Mover el `CardContent` (Plantilla, botón "Activar todos los campos", switches estándar y personalizados) dentro de `CollapsibleContent`, conservando intacta toda la lógica existente (`applyPreset`, `updateFieldConfig`, `customFields`, etc.).
5. Mantener la columna izquierda (`lg:col-span-1`) tal cual; al colapsar, la `Card` se reducirá a sólo la cabecera y la columna del formulario seguirá ocupando `lg:col-span-2` como ya está configurado.

### Detalles de UX

- Estado inicial: **colapsado** (oculta de inmediato la lista larga).
- Animación suave del chevron al expandir/contraer.
- Sin cambios en la lógica de visibilidad de campos ni en `field_config` — sólo es UI.
- Sin cambios en `CreateContactDialog` ni `EditContactDialog` (no se ha pedido para contactos; solo el artista actual).

## Fuera de alcance

- No se tocan los switches, presets ni la persistencia de `field_config`.
- No se modifican otros módulos ni la base de datos.
