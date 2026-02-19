
# Resaltar la fecha de lanzamiento digital en el calendario de fecha física

## Situación actual

El componente `DatePicker` (definido inline en línea 574 de `CreateReleaseBudgetDialog.tsx`) renderiza:

```tsx
<Calendar mode="single" selected={value} onSelect={onChange} initialFocus className="p-3" defaultMonth={defaultMonth} />
```

El calendario de "Fecha de lanzamiento físico" ya salta al mes correcto (gracias a `defaultMonth={releaseDate}`), pero no hay ninguna indicación visual de cuál es la fecha digital de referencia.

## Solución

### 1. Pasar `releaseDate` al `DatePicker` como prop `highlightDate`

Añadir una prop opcional `highlightDate?: Date` al componente `DatePicker`:

```tsx
const DatePicker = ({
  value, onChange, label: dateLabel, defaultMonth, highlightDate
}: {
  value?: Date;
  onChange: (d?: Date) => void;
  label: string;
  defaultMonth?: Date;
  highlightDate?: Date;           // ← nuevo
}) => (...)
```

### 2. Usar `modifiers` + `modifiersClassNames` del `<Calendar>`

React-day-picker soporta modificadores personalizados. Se pasa `highlightDate` como modifier `digitalRelease` y se le asigna una clase CSS:

```tsx
<Calendar
  mode="single"
  selected={value}
  onSelect={onChange}
  initialFocus
  className="p-3 pointer-events-auto"
  defaultMonth={defaultMonth}
  modifiers={{
    digitalRelease: highlightDate ? [highlightDate] : [],
  }}
  modifiersClassNames={{
    digitalRelease: "bg-violet-500/20 text-violet-700 dark:text-violet-300 font-semibold rounded-md ring-1 ring-violet-400/50",
  }}
/>
```

Esto resalta el día de la fecha digital con un fondo violeta suave y un anillo de color, diferenciándolo claramente del día seleccionado (`bg-primary`) y del día de hoy (`bg-accent`).

### 3. Pasar `releaseDate` al `DatePicker` de fecha física

```tsx
// Antes:
<DatePicker
  label="Fecha de lanzamiento físico (opcional)"
  value={physicalDate}
  onChange={setPhysicalDate}
  defaultMonth={!physicalDate && releaseDate ? releaseDate : undefined}
/>

// Después:
<DatePicker
  label="Fecha de lanzamiento físico (opcional)"
  value={physicalDate}
  onChange={setPhysicalDate}
  defaultMonth={!physicalDate && releaseDate ? releaseDate : undefined}
  highlightDate={releaseDate ?? undefined}
/>
```

El calendario de la fecha digital no necesita `highlightDate` (ya está seleccionada y resaltada con `bg-primary`). Los calendarios de los Singles tampoco, para mantener la UI limpia.

### 4. Tooltip de contexto (visual bonus)

Debajo del trigger del DatePicker de fecha física, si hay `releaseDate`, añadir una línea:

```tsx
{releaseDate && (
  <p className="text-[10px] text-muted-foreground">
    <span className="inline-block w-2 h-2 rounded-sm bg-violet-400/70 mr-1 align-middle" />
    Fecha digital: {format(releaseDate, "dd MMM yyyy", { locale: es })}
  </p>
)}
```

Esto proporciona contexto incluso antes de abrir el calendario.

## Archivos a modificar

Solo **`src/components/releases/CreateReleaseBudgetDialog.tsx`**:

- Línea 574: añadir `highlightDate` a la interfaz del `DatePicker`
- Línea 590: añadir `modifiers` + `modifiersClassNames` + `className` con `pointer-events-auto`
- Línea 575–593: añadir el tooltip de contexto cuando hay `highlightDate`
- Línea 860: pasar `highlightDate={releaseDate ?? undefined}` al DatePicker de fecha física

Sin cambios en base de datos ni en otros archivos.

## Resultado visual esperado

Al abrir el calendario de "Fecha de lanzamiento físico":
- El calendario abre en el mes de la fecha digital (ya funciona)
- La fecha digital aparece resaltada con un fondo violeta/lila suave + anillo de borde
- La fecha física seleccionada (si ya existe) sigue usando el color primario (`bg-primary`)
- Debajo del botón trigger aparece "◼ Fecha digital: 15 jun 2026" en texto pequeño gris
