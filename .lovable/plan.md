
# Correcciones en el wizard de Presupuesto de Lanzamiento

## 4 cambios a implementar

---

### 1. VERSIONES → Single select (radio)

**Problema:** Actualmente es multi-select con Checkboxes, pero el usuario solo debe poder seleccionar una versión.

**Solución:** Convertir los `Checkbox` a `RadioGroup` / `RadioGroupItem` de Radix UI. Solo una versión seleccionable a la vez.

- Estado: cambiar `versions: string[]` → `version: string` (single value, no array).
- UI: Grid 2 columnas con `RadioGroupItem` en lugar de `Checkbox`.
- Actualizar `handleSubmit` para guardar `version` (string) en metadata en lugar de `versions`.

**Contraste (bug del texto):** El color actual al seleccionar usa `text-primary` sobre fondo `bg-primary/10`. En modo claro el texto verde es legible, pero en algunos temas el `text-primary` puede superponerse al fondo. El fix: cuando el item está seleccionado, el `<span>` del label usa `text-foreground font-medium` (no `text-primary`) para garantizar máximo contraste. El indicador visual (el radio circle verde) ya comunica la selección.

---

### 2. SERVICIOS CONTRATADOS → Estética de grid con checkboxes

**Problema:** El selector de servicios es un dropdown/popover tipo `Command`, con estética diferente a los otros campos (Versiones, Formatos físicos).

**Solución:** Reemplazar el Popover/Command dropdown por un **bloque de checkboxes en grid 2 columnas**, idéntico visualmente al bloque de Versiones y Formatos físicos.

- Eliminar el `<Popover>` y el `<Command>` de servicios.
- Reemplazar por `<div className="rounded-md border border-border bg-muted/20 p-3">` con grid 2x columnas de checkboxes.
- Cada servicio es `<label>` con `<Checkbox>` + `<span>`.

**Contraste en checkboxes:** Cuando el checkbox está marcado, el `<span>` del texto lleva `className="text-sm text-foreground"` siempre (no heredar color del padre que puede ser `text-primary`). El `Checkbox` ya muestra el check verde sin afectar el texto.

---

### 3. SINGLES PREVIOS → Selector de tracks existentes

**Problema:** Los "Singles previos" solo tienen un date picker. No permiten seleccionar una canción existente ni añadir un nuevo título que se propague a Créditos/Audio.

**Solución:** Cada single ahora tiene:
- **Un selector de canción**: si ya existen tracks en el release, se muestra un `Select` con los tracks disponibles. Al seleccionar una canción existente, se vincula su ID y nombre.
- **Opción "Nuevo single"**: si se elige "+ Nuevo título", aparece un `Input` para escribir el nombre. Al crear el presupuesto, en `handleSubmit` se insertará automáticamente el nuevo track en la tabla `tracks` con ese título y `track_number` = siguiente disponible.
- **Date picker** para la fecha del single (igual que ahora).

El estado `singleDates: Date[]` se amplía a `singles: { title?: string; trackId?: string; date?: Date }[]`.

En `handleSubmit`, para cada single con `title` y sin `trackId`, se inserta el track en la tabla `tracks` con el título dado.

---

### 4. FIX DE CONTRASTE EN TEXTOS SELECCIONADOS

**Problema:** Al seleccionar chips/checkboxes, el texto puede volverse ilegible (texto oscuro sobre fondo oscuro, o texto claro sobre fondo claro, visible en la screenshot de "Sin asignar" azul).

**Fix global en el dialog:** En todos los lugares donde se usan labels dentro de items seleccionados:

```tsx
// ANTES (problema)
<span className="text-sm">{opt.label}</span>

// DESPUÉS (fix)
<span className="text-sm text-foreground">{opt.label}</span>
```

Específicamente en:
- Grid de Versiones (radio labels)
- Grid de Servicios contratados (checkbox labels)
- Grid de Formatos físicos (checkbox labels)
- Cualquier badge/chip con fondo de color activo

Para el caso específico de "Sin asignar" en azul (screenshot 3), corresponde a un botón de tipo `variant="outline"` con clases de selección activa que fuerzan `bg-primary text-primary-foreground`. Revisar que los triggers de Select/Combobox con valor vacío muestren el placeholder correctamente.

---

## Archivos a modificar

Solo **`src/components/releases/CreateReleaseBudgetDialog.tsx`**:

1. **~línea 221**: Cambiar estado `versions: string[]` a `version: string` (default `'original'`)
2. **~línea 235**: Ampliar `singleDates: Date[]` a `singles: { title?: string; trackId?: string; isNew?: boolean; date?: Date }[]`
3. **~línea 419**: Actualizar `handleSubmit` metadata: `version` (string) en lugar de `versions`
4. **~línea 567**: En la sección de sync de tracks, añadir inserción de tracks de singles nuevos
5. **~línea 886**: Reemplazar grid de `Checkbox` (multi) por `RadioGroup`/`RadioGroupItem` (single)
6. **~línea 1020**: Reemplazar Popover/Command de servicios por grid de checkboxes con estética unificada
7. **~línea 1094**: Reemplazar sección "Singles previos" con el nuevo bloque que incluye selector de track + input de título nuevo
8. **Corrección de contraste global**: añadir `text-foreground` a todos los `<span>` de labels dentro de items seleccionables

### Imports a añadir
- `RadioGroup, RadioGroupItem` de `@/components/ui/radio-group`
- `useTracks` de `@/hooks/useReleases` (para cargar tracks existentes en el selector de singles)
