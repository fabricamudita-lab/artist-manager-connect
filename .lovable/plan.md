## Diagnóstico

El panel "Eventos para…" no ha desaparecido del código — sigue renderizándose en `src/pages/Calendar.tsx` (línea 1182). El problema es de **layout**: en cambios anteriores el contenedor raíz se quedó con:

```tsx
<div className="container-moodita py-4 space-y-4 min-h-screen flex flex-col">
  ...
  <div className="flex-1">
    {/* vista del calendario */}
  </div>
  {/* Panel de eventos del rango */}
  ...
</div>
```

`min-h-screen flex flex-col` + `flex-1` en la vista hacen que el calendario estire verticalmente para llenar la pantalla, empujando el panel **debajo del fold** (fuera de la vista). El panel sigue existiendo si haces scroll, pero ya no se ve sin desplazarse. Antes ese panel iba inmediatamente debajo del calendario.

## Cambio

**Archivo único: `src/pages/Calendar.tsx`**

1. Quitar `min-h-screen flex flex-col` del contenedor raíz (línea 1159) — el layout ya gestiona altura desde el shell de la app.
2. Quitar `flex-1` del wrapper de la vista del calendario (línea 1177).

Resultado: la vista del calendario ocupa su altura natural y el panel "Eventos para…" queda visible justo debajo, como antes.

## Sobre tus instrucciones de proceso

No aplican aquí: no hay tabla nueva, ni endpoint, ni input de usuario. Es un fix de CSS/layout en una sola página front. No requiere migración, índices, validación Zod, ni paginación. Si quieres que aplique esos principios al añadir una **nueva** funcionalidad, indícamela y los aplico ahí.
