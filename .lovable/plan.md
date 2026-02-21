

# Mejoras al OwnerDashboard: jerarquia visual, tendencias, atencion urgente y PermissionChip

Cuatro mejoras al dashboard del manager sin eliminar codigo existente — solo se anade y reorganiza.

---

## 1. Seccion "Requiere Atencion Hoy" como primera card

Antes de las stats, insertar una card destacada que muestre una lista priorizada de items que necesitan accion inmediata:

- **Solicitudes pendientes de mas de 48h**: query `solicitudes` con `estado = 'pendiente'` y `fecha_creacion < now() - 48h`
- **Bookings confirmados sin contrato subido**: query `booking_offers` con `estado = 'confirmado'` y sin documentos tipo contrato asociados en `booking_documents`
- **Eventos proximos (7 dias) sin roadmap**: query `events` proximos 7 dias que no tengan `roadmap` asociado

Si no hay items urgentes, se muestra un mensaje positivo ("Todo al dia") en verde.

### Implementacion

Se anade la logica de fetch de estos 3 queries dentro de `fetchGlobalData` en `OwnerDashboard.tsx`. Se crea un nuevo estado `attentionItems` con la lista de items. Se renderiza la card antes de las stat cards.

---

## 2. Micro-tendencias con flechas y % de cambio

Cada KPI card principal mostrara: valor actual + comparacion vs mes anterior.

### Logica de calculo

Dentro de `fetchGlobalData`, para las 4 metricas principales se consultan tambien los datos del mes anterior:

- **Artistas**: comparar count actual vs count hace 30 dias (usando `created_at`)
- **Ingresos**: comparar revenue de bookings confirmados este mes vs mes anterior (usando `created_at` de booking_offers)
- **Eventos**: comparar count eventos proximos 30 dias actual vs mismo periodo hace 30 dias
- **Solicitudes pendientes**: comparar count actual vs hace 30 dias

Cada stat card muestra una flecha verde (arriba) o roja (abajo) con el % de cambio. Si no hay datos del mes anterior, no se muestra tendencia.

### Implementacion

Nuevo estado `trends` con `{ artists: number | null, revenue: number | null, events: number | null, solicitudes: number | null }`. Se calcula `((actual - anterior) / anterior) * 100`. Se pasa como prop `trend` a cada card.

---

## 3. Reemplazar PermissionChip por indicador de rol claro

El `PermissionChip` sin contexto (sin `projectId`/`artistId`) muestra "Sin acceso" en rojo porque no puede evaluar permisos sin un recurso especifico. Esto es confuso en el dashboard.

### Solucion

En `Dashboard.tsx`, reemplazar `<PermissionChip />` por un `Badge` simple que muestre el rol activo del usuario:
- **Management**: Badge con icono `Crown` y texto "Manager", variante `default`
- **Artist**: Badge con icono `Music` y texto "Artista", variante `secondary`

No se elimina `PermissionChip` del codebase — solo se deja de usar en esta pagina especifica. Sigue disponible para contextos con recurso (proyectos, artistas).

---

## 4. Jerarquia visual: cards grandes y pequenas

Reorganizar las 8 metricas en dos niveles de importancia:

### Fila principal (cards grandes, `md:grid-cols-2`)
- **Artistas activos**: card grande con icono, numero y tendencia
- **Ingresos totales**: card grande con icono, numero y tendencia

### Fila secundaria (cards pequenas, `md:grid-cols-3 lg:grid-cols-6`)
- Proximos Eventos, Solicitudes Pendientes, Sincronizaciones, Presupuestos, EPKs, Contactos
- Mas compactas: solo icono, numero y label, sin subtitulo

### Implementacion

En `OwnerDashboard.tsx`, dividir el grid actual en dos secciones:
1. `grid md:grid-cols-2 gap-4` para las 2 cards principales (mas altas, con tendencia y gradiente sutil)
2. `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3` para las 6 cards secundarias (compactas)

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/components/dashboard/OwnerDashboard.tsx` | Seccion atencion, tendencias en KPIs, jerarquia visual (cards grandes/pequenas) |
| `src/pages/Dashboard.tsx` | Reemplazar `PermissionChip` por Badge de rol |

## Lo que NO se elimina

- Todo el codigo existente de `OwnerDashboard` (queries, estados, logica)
- `PermissionChip` sigue en el codebase, solo deja de usarse en Dashboard
- `CollaboratorDashboard` no se toca
- Las secciones de "Solicitudes Pendientes" y "Proximos Eventos" al final se mantienen
