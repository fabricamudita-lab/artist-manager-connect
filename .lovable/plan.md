## Objetivo

Permitir al usuario cambiar el rango temporal del gráfico **"Actividad"** en `SolicitudesStats` entre:

- Últimos 30 días
- Últimos 3 meses
- Últimos 6 meses
- Último año

## Cambios

Modificar **`src/components/SolicitudesStats.tsx`**:

1. Añadir estado local `range` con valores `'30d' | '3m' | '6m' | '1y'` (default `'30d'`).
2. Sustituir el cálculo fijo `last30Days` (líneas 83-101) por una función que, según `range`, genere puntos con la **granularidad adecuada** para evitar gráficos ilegibles:
   - **30d** → 30 puntos diarios (como ahora).
   - **3m** (~13 puntos) → agrupados por **semana** (`startOfWeek`).
   - **6m** (~26 puntos) → agrupados por **semana**.
   - **1y** → 12 puntos por **mes** (`startOfMonth`).
   
   Para cada bucket: contar `solicitudes` cuya `fecha_creacion` cae dentro → `creadas`; cuya `decision_fecha` cae dentro → `resueltas`. Etiqueta del eje X formateada con `date-fns/locale/es` (ej. `dd MMM` para días/semanas, `MMM yy` para meses).
3. Mover `last30Days` fuera del `useMemo` principal o añadir `range` como dependencia. Renombrar internamente a `timelineData`.
4. En la cabecera del Card del gráfico:
   - Título dinámico: "Actividad — Últimos 30 días / 3 meses / 6 meses / Último año".
   - Añadir a la derecha un `<Select>` compacto (w-[160px]) con las 4 opciones.
   - Layout: `CardHeader` con `flex items-center justify-between`.
5. Mantener el resto del componente intacto (KPIs, distribuciones, etc.).

## Detalles técnicos

- Usar `date-fns`: `subDays`, `subMonths`, `startOfWeek({ weekStartsOn: 1 })`, `startOfMonth`, `format`, `locale: es`.
- Construir buckets con `Map<string, { creadas, resueltas }>` indexado por la fecha de inicio del bucket en ISO, recorriendo cada solicitud una sola vez (más eficiente que el doble `filter` actual).
- Sin cambios en BD ni props del componente.
