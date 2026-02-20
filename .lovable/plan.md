
# Optimización y complemento del módulo Proyectos

## Qué existe actualmente y qué se mejora

El `ProjectDetail.tsx` ya tiene: hero con nombre/estado/fechas, barra de progreso del checklist, `ProjectChecklistManager` (vista lista + flujo Kanban + secciones PREPARATIVOS/PRODUCCIÓN/CIERRE), y tabs de Presupuestos, Documentos, Contratos, Solicitudes, Aprobaciones, Notas. **No se elimina nada.**

El prototipo propone 4 mejoras complementarias:

---

## Mejora 1: Tab "Vista General" como primera pestaña (Overview enriquecido)

Actualmente la primera tab es "Proyectos" (gestor de archivos). El prototipo propone una tab de resumen ejecutivo que actúa como el **dashboard del proyecto**.

Se añade una nueva pestaña "Vista General" como primera en el `TabsList`, con tres secciones:

### 1a. Misión y "Por qué existe" (si los campos existen en el proyecto)

Dos cards lado a lado:
- Verde: "Objetivo / Misión" — usa el campo `objective` ya existente
- Azul: "Por qué existe" — usa el campo `description` ya existente (actualmente se muestra solo en la card de Detalles del Proyecto, sin contexto visual)

Estos campos ya se persisten en la base de datos y se cargan en el estado `project`.

### 1b. 4 KPIs calculados dinámicamente

```
┌────────────┐ ┌──────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Checklist  │ │ Presupuestos     │ │ Solicitudes      │ │ Contratos        │
│ X/Y tareas │ │ N vinculados     │ │ N vinculadas     │ │ N vinculados     │
│ Z% completd│ │ ver pestaña →    │ │ ver pestaña →    │ │ ver pestaña →    │
└────────────┘ └──────────────────┘ └─────────────────┘ └─────────────────┘
```

Los datos (`budgets.length`, `contracts.length`, `solicitudes.length`) ya están en el estado del componente — solo hay que mostrarlos.

### 1c. Cards de entidades vinculadas

Sección "Entidades vinculadas al proyecto" con cards para:
- **Booking** (presupuestos de tipo booking ya vinculados al proyecto via `project_id`)
- **Solicitudes** (ya se cargan desde `solicitudes` state)
- **Documentos** (ya se cargan desde `documents` state)

Cada card muestra los primeros 3-4 items con su estado y un enlace "Ver en [módulo] →" (link de navegación).

---

## Mejora 2: Header del proyecto — Team avatars apilados + botón "Vincular entidad"

El header actual muestra artista, fecha inicio, fecha fin. No muestra el equipo.

Se añaden al final del header:
- **Avatars apilados del equipo** (los primeros 3, con +N si hay más) — datos ya disponibles en `team` state
- **Botón "+ Vincular entidad"** en verde junto al botón "Crear nuevo" — al hacer clic abre un dropdown con: "Booking existente", "Release existente", "Solicitud existente"

El botón de vincular abre el `AssociateProjectDialog` ya existente en el codebase.

---

## Mejora 3: Cronograma como nueva tab (Gantt visual)

Se añade una tab "Cronograma" entre "Checklist" y "Presupuestos" en el `TabsList`.

El contenido es un **Gantt simplificado** que agrega en una línea de tiempo unificada:
- Fechas de los `budgets` vinculados al proyecto (shows con `event_date`)
- Fechas de las `solicitudes` vinculadas

La implementación usa un grid CSS con columnas de meses, similar al prototipo pero en escala de días/semanas calculada a partir de `start_date` y `end_date_estimada` del proyecto. Es puramente visual — datos ya disponibles en los states existentes.

**Layout de cada fila:**
```
[Nombre entidad 220px] | [barra coloreada según tipo y duración]
```

Los tipos/colores:
- Booking (presupuesto vinculado) → verde `bg-green-500`
- Solicitud → azul `bg-blue-500`
- Contrato → naranja `bg-amber-500`

---

## Mejora 4: Checklist — añadir vista "Cronograma" como tercera opción

El `ProjectChecklistManager` ya tiene `viewMode: 'list' | 'flow'`. Se añade `'cronograma'` como tercera opción que muestra las tareas con fecha de vencimiento en una vista de timeline semanal ordenada por `completed_at` / fecha estimada.

---

## Cambios técnicos concretos — solo `src/pages/ProjectDetail.tsx`

No se modifica `ProjectChecklistManager`, no se crean nuevos componentes, no se cambia la base de datos.

### Cambio 1: Nueva tab "Vista General" como primera opción

Modificar el `TabsList` (líneas 1115-1155) de:
```
grid-cols-7: Proyectos | Presupuestos | Documentos | Contratos | Solicitudes | Aprobaciones | Notas
```
A:
```
grid-cols-8: Vista General | Proyectos | Presupuestos | Documentos | Contratos | Solicitudes | Aprobaciones | Notas
```

Y añadir `defaultValue="vista-general"` al componente `Tabs`.

Nueva `TabsContent value="vista-general"` con:
- Misión + Por qué (cards verde/azul usando `project.objective` y `project.description`)
- 4 KPI cards (checklist progress, budgets.length, solicitudes.length, contracts.length)
- Lista de entidades vinculadas (budgets como shows, solicitudes)

### Cambio 2: Añadir team avatars al hero section

En el hero (línea 921-986), añadir después de los datos de fecha/artista:
```tsx
{team.length > 0 && (
  <div className="flex items-center gap-1 mt-2">
    {team.slice(0, 4).map((member, i) => (
      <Avatar key={member.id} className="w-7 h-7 border-2 border-background" style={{ marginLeft: i > 0 ? -8 : 0 }}>
        <AvatarFallback className="text-xs bg-primary/20">
          {member.full_name.split(' ').map(n => n[0]).join('').slice(0,2)}
        </AvatarFallback>
      </Avatar>
    ))}
    {team.length > 4 && (
      <span className="text-xs text-muted-foreground ml-2">+{team.length - 4} más</span>
    )}
  </div>
)}
```

### Cambio 3: Nueva tab "Cronograma" en ProjectDetail

Añadir `TabsTrigger value="cronograma"` y su `TabsContent` correspondiente con el Gantt calculado a partir de los datos ya disponibles.

La función `renderCronograma()` calcula el rango de meses entre `project.start_date` y `project.end_date_estimada`, y ubica cada entidad (booking, solicitud) en ese grid según sus fechas.

---

## Resultado final de las tabs

```
[Vista General] [Proyectos] [Checklist] [Cronograma] [Presupuestos] [Documentos] [Contratos] [Solicitudes] [Aprobaciones] [Notas]
```

La tab "Checklist" se extrae del interior de "Proyectos" y se hace independiente para mayor visibilidad (actualmente el checklist está fuera de las tabs como `ProjectChecklistManager` standalone — esto se mantiene igual, y el Cronograma se añade como tab independiente).

---

## Archivos afectados

| Archivo | Sección | Cambio |
|---|---|---|
| `src/pages/ProjectDetail.tsx` | TabsList (líneas 1112-1155) | Añadir tab "Vista General" como primera, añadir tab "Cronograma" |
| `src/pages/ProjectDetail.tsx` | Hero section (líneas 921-986) | Añadir team avatars apilados |
| `src/pages/ProjectDetail.tsx` | Nuevas TabsContent | Vista General con KPIs + Cronograma Gantt |

**Sin tocar:** `ProjectChecklistManager`, `ProjectFilesManager`, `ApprovalsModule`, base de datos, rutas, hooks existentes. Todo se basa en datos ya cargados en el state del componente.
