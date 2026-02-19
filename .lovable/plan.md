
# Rediseño del Paso 2 de Fechas — Visibilidad inmediata sin leer datos

## El problema actual

La tabla actual (HITO | CRONOGRAMA | CALCULADO | SELECCIONADO) obliga al usuario a:
1. Leer 3 columnas de fechas por fila
2. Mentalmente comparar cuál es cuál
3. Interpretar el badge "real" para entender el origen
4. Procesar terminología técnica ("Calculado", "Seleccionado", "real")

## La nueva propuesta: Diseño orientado a la acción

### Reemplazar la tabla por tarjetas de hito con indicador visual inmediato

Cada hito se muestra como una **fila compacta** con:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🟢 Grabación          15 feb ───────────────── 🗓 del cronograma│
│ ⚫ Masters             25 dic ─ calculado automáticamente        │
│ 🔵 Salida Digital     08 feb ↗ ajustado (era 15 feb)            │
└─────────────────────────────────────────────────────────────────┘
```

### Diseño visual detallado

**Columna izquierda**: nombre del hito
**Centro**: la fecha final única y grande, sin ambigüedad
**Derecha**: contexto mínimo con un **pill de origen** coloreado

Los pills de origen reemplazan toda la tabla comparativa:
- 🟢 `del plan` → verde suave (viene del cronograma real)
- ⚪ `auto` → gris (calculado por offset)
- 🟡 `ajustado` → ámbar (cronograma + autorrelleno difieren, se tomó el cronograma)

Si la fecha del cronograma y la calculada **coinciden o son muy cercanas** (≤ 3 días), no se muestra el pill para no añadir ruido.

### Las 3 estrategias: renombrar a lenguaje cotidiano

Eliminar "Cronograma / Recalcular / Mezclar" por nombres que cualquier usuario entiende:

| Actual | Nuevo | Subtítulo |
|--------|-------|-----------|
| Usar cronograma | **Usar el plan** | Respeta las fechas que ya tienes |
| Recalcular | **Calcular desde cero** | Ignora el plan, parte de la fecha de salida |
| Mezclar | **Completar vacíos** | Usa el plan donde existe, calcula el resto |

### Nuevo layout de la tabla — por fila, una fecha, un vistazo

```
Grabación    ─────────────────    07 dic   [del plan]
Mezcla       ─────────────────    22 dic   [del plan]
Masters      ─────────────────    25 dic   [auto]
Arte         ─────────────────    28 dic   [auto]
Entrega DSP  ─────────────────    28 dic   [auto]
Pre Save     ─────────────────    11 ene   [auto]
Anuncio      ─────────────────    25 ene   [auto]
Salida Digital ───────────────    15 feb   [del plan]
```

Sin columnas múltiples. Una fecha, uno color.

### ¿Qué pasa con la diferencia de días?

Cuando `cronogramaDate` y `calculatedDate` difieren, el tooltip del pill muestra:
> "El plan dice 07 dic, el cálculo automático dice 30 nov"

Así el usuario accede al detalle **solo si le interesa**, sin tenerlo siempre a la vista.

---

## Cambios técnicos en `CreateReleaseBudgetDialog.tsx`

### 1. Selector de estrategia (líneas 1156–1178)

Reemplazar los 3 botones con iconos por una UI más clara:

```tsx
// Nuevas etiquetas
{ value: 'cronograma', label: 'Usar el plan', desc: 'Respeta las fechas que ya tienes', icon: CalendarCheck }
{ value: 'autocalcular', label: 'Calcular desde cero', desc: 'Ignora el plan, parte de la fecha de salida', icon: Calculator }
{ value: 'mezclar', label: 'Completar vacíos', desc: 'Usa el plan donde existe, calcula el resto', icon: Blend }
```

### 2. Tabla comparativa (líneas 1184–1210)

Reemplazar por rows de 2 columnas (nombre + fecha con pill):

```tsx
{getResolvedDeadlines().map(d => {
  const hasDiff = d.cronogramaDate && 
    Math.abs(differenceInDays(d.cronogramaDate, d.calculatedDate)) > 0;
  
  const pillLabel = d.source === 'cronograma' ? 'del plan' : 'auto';
  const pillClass = d.source === 'cronograma' 
    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
    : 'bg-muted text-muted-foreground';

  return (
    <div key={d.key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm font-medium text-foreground">{d.name}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tabular-nums">
          {format(d.finalDate, "d MMM", { locale: es })}
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className={cn("text-[10px] px-1.5 py-0 cursor-default", pillClass)}>
                {pillLabel}
              </Badge>
            </TooltipTrigger>
            {hasDiff && (
              <TooltipContent>
                <p>Plan: {format(d.cronogramaDate!, "d MMM", {locale: es})}</p>
                <p>Auto: {format(d.calculatedDate, "d MMM", {locale: es})}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
})}
```

### 3. Sección sin cronograma (líneas 1219–1231)

Mismo redesign aplicado al caso "no cronograma":
- Eliminar el label "Deadlines calculados:"
- Mostrar directamente las filas con pill `auto` en gris

### 4. Tip de offset visible

Bajo cada fecha, una línea gris muy pequeña mostrando el offset:
> "−70 días desde salida"

Esto enseña la lógica sin ocupar espacio — el usuario entiende el sistema.

---

## Archivos a modificar

Solo **`src/components/releases/CreateReleaseBudgetDialog.tsx`**:

- Líneas ~1152–1154: Cambiar label "Estrategia de deadlines" + descripción por textos más amigables
- Líneas ~1158–1161: Renombrar las 3 opciones de estrategia
- Líneas ~1184–1210: Reemplazar tabla 4 columnas por lista de 2 columnas (nombre | fecha + pill)
- Líneas ~1219–1231: Redesign del caso sin cronograma con el mismo patrón

Ningún cambio en lógica, tipos ni base de datos — solo cambios de presentación.
