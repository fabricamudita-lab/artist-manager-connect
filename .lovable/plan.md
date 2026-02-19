
# Sincronizar mes del calendario físico con la fecha digital

## Qué pasa actualmente

En `CreateReleaseBudgetDialog.tsx`:
- `releaseDate` → Fecha digital (principal)
- `physicalDate` → Fecha física, empieza sin valor (`undefined`), y el calendario interno del `DatePicker` abre por defecto en el mes actual del sistema

## Qué debe pasar

Cuando el usuario abre el calendario de "Fecha de lanzamiento físico":
- Si ya hay una fecha digital seleccionada, el calendario debe mostrar ese mismo mes/año por defecto
- Si no hay fecha digital, el comportamiento actual se mantiene (mes actual)

El usuario **no debe ver ningún valor pre-seleccionado** — solo el calendario ya posicionado en el mes correcto.

## Cambio técnico

### `src/components/releases/CreateReleaseBudgetDialog.tsx`

El componente interno `DatePicker` (definido dentro del mismo archivo) acepta las props estándar de `react-day-picker`. El `DayPicker` (usado dentro de `<Calendar>`) tiene una prop `defaultMonth` que controla en qué mes se posiciona inicialmente el calendario **sin seleccionar ningún día**.

**Cambio:**
```tsx
// Antes:
<DatePicker 
  label="Fecha de lanzamiento físico (opcional)" 
  value={physicalDate} 
  onChange={setPhysicalDate} 
/>

// Después:
<DatePicker 
  label="Fecha de lanzamiento físico (opcional)" 
  value={physicalDate} 
  onChange={setPhysicalDate}
  defaultMonth={!physicalDate && releaseDate ? releaseDate : undefined}
/>
```

**También:** Pasar `defaultMonth` a la prop del componente `DatePicker` local:
```tsx
// Firma del DatePicker local (dentro del dialog):
function DatePicker({ label, value, onChange, defaultMonth }: {
  label: string;
  value?: Date;
  onChange: (date?: Date) => void;
  defaultMonth?: Date;  // AÑADIR
}) {
  // Y pasarlo al <Calendar>:
  <Calendar
    mode="single"
    selected={value}
    onSelect={onChange}
    defaultMonth={defaultMonth}  // AÑADIR
    initialFocus
    ...
  />
}
```

### Lógica del `defaultMonth`

```text
physicalDate ya seleccionado  → el calendario abre en la fecha seleccionada (comportamiento estándar de react-day-picker)
physicalDate vacío + releaseDate existe  → defaultMonth = releaseDate (mismo mes que el digital)
physicalDate vacío + releaseDate vacío  → defaultMonth = undefined (mes actual del sistema)
```

Solo se modifica un archivo: `src/components/releases/CreateReleaseBudgetDialog.tsx`. Sin cambios en base de datos, sin lógica de negocio.
