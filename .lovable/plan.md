
# Reorganización funcional de la navegación (AppSidebar)

## Diagnóstico del problema actual

El sidebar tiene 4 grupos arbitrarios: **Principal** (Dashboard, Artistas, Drive, Calendario, Action Center, Finanzas), **Gestión** (Booking, Sincros, Roadmaps, Proyectos, Discografía), **Herramientas** (Correo, Chat, Documentos, EPKs, Analytics), **Administración** (Equipos, Contactos, Mi Perfil, Ajustes).

Los problemas concretos:
- "Finanzas" en Principal cuando es una herramienta operativa
- "Action Center" es un anglicismo que no comunica qué hace el módulo
- "Principal" y "Gestión" no son conceptos del mundo de la gestión artística
- El usuario debe deducir qué hay detrás de cada grupo

## Nueva estructura de grupos propuesta

```text
┌─────────────────────────────────┐
│  INICIO                         │
│  · Dashboard                    │
├─────────────────────────────────┤
│  ARTISTAS                       │
│  · Mis Artistas (/mi-management)│
│  · Proyectos (/proyectos)       │
│  · Discografía (/releases)      │
├─────────────────────────────────┤
│  OPERACIONES  (solo management) │
│  · Booking (/booking)       [N] │ ← badge opcional
│  · Sincronizaciones             │
│  · Hojas de Ruta                │
├─────────────────────────────────┤
│  DINERO                         │
│  · Finanzas (/finanzas)         │
│  · Presupuestos (/budgets)      │
│  · Analytics (/analytics)       │
├─────────────────────────────────┤
│  ARCHIVOS                       │
│  · Drive (/drive)               │
│  · Documentos (/documents)      │
├─────────────────────────────────┤
│  COMUNICACIÓN                   │
│  · Solicitudes (/solicitudes)[N]│ ← badge obligatorio
│  · Correo (/correo)             │
│  · Chat (/chat)                 │
├─────────────────────────────────┤
│  ADMINISTRACIÓN (solo mgmt)     │
│  · Equipos                      │
│  · Contactos                    │
│  · EPKs                         │
│  · Calendario                   │
│  · Mi Perfil                    │
│  · Ajustes                      │
└─────────────────────────────────┘
```

**Cambios de nombre clave:**
- "Action Center" → **"Solicitudes"** (ya es el nombre de la ruta `/solicitudes`, solo se alinea el label)
- "Artistas" → **"Mis Artistas"** (más específico)
- El grupo "Principal" desaparece — Dashboard queda solo en INICIO
- "Drive" queda en ARCHIVOS junto a Documentos (relación lógica)
- Calendario pasa a ADMINISTRACIÓN (herramienta de soporte, no operativa)

## Sobre los badges de conteo — Mi análisis honesto

**La pregunta es válida y la respuesta es: sí, pero con criterio estricto.**

Los badges son útiles únicamente cuando:
1. El dato es **accionable de inmediato** desde ese módulo
2. El número cambia con suficiente frecuencia para justificar la carga
3. El badge no se vuelve ruido de fondo que el usuario ignora (efecto "notification blindness")

**Recomendación para esta implementación:**

| Item | Badge | Razón |
|---|---|---|
| Solicitudes | ✅ Siempre | El módulo entero es "cosas pendientes de tu acción". El badge es su razón de existir. |
| Booking | ⚠️ Solo si hay > 0 negociaciones activas | Útil para management. Se obtiene de `action_center` ya cargado. |
| Finanzas | ❌ No por ahora | "Facturas pendientes" requeriría otra query que hoy no existe. Añadir deuda de performance. |
| Correo | ❌ No | El correo es mock data — badge engañoso. |

**Implementación técnica del badge:**
El hook `useActionCenter` ya expone `stats.pending` (count de items `status === 'pending'`). Este dato se puede usar en el sidebar sin query adicional. Se usará específicamente para el badge de **Solicitudes**.

Para Booking, se puede mostrar el conteo de items `item_type === 'booking_request'` con `status === 'pending'` del mismo hook — un filtro sobre datos ya en memoria, sin query extra.

## Implementación técnica

### Solo se modifica `src/components/AppSidebar.tsx`

**Cambio 1: Nueva estructura de grupos**

Reemplazar la función `getNavigationItems` con grupos semánticamente correctos:

```ts
const navigationGroups = [
  {
    label: null, // sin label — solo Dashboard
    items: [
      { title: "Dashboard", url: "/dashboard", icon: Home },
    ]
  },
  {
    label: "Artistas",
    items: [
      { title: "Mis Artistas", url: "/mi-management", icon: Music },
      { title: "Proyectos", url: "/proyectos", icon: FolderKanban },
      { title: "Discografía", url: "/releases", icon: Disc3 },
    ]
  },
  {
    label: "Operaciones",
    managementOnly: true,
    items: [
      { title: "Booking", url: "/booking", icon: Mic, badge: 'booking' },
      { title: "Sincronizaciones", url: "/sincronizaciones", icon: Film },
      { title: "Hojas de Ruta", url: "/roadmaps", icon: Map },
    ]
  },
  {
    label: "Dinero",
    items: [
      { title: "Finanzas", url: "/finanzas", icon: Wallet },
      { title: "Presupuestos", url: "/budgets", icon: Calculator },
    ],
    managementExtra: [
      { title: "Analytics", url: "/analytics", icon: BarChart },
    ]
  },
  {
    label: "Archivos",
    items: [
      { title: "Drive", url: "/drive", icon: HardDrive },
      { title: "Documentos", url: "/documents", icon: FileText },
    ]
  },
  {
    label: "Comunicación",
    items: [
      { title: "Solicitudes", url: "/solicitudes", icon: Bell, badge: 'pending' },
      { title: "Correo", url: "/correo", icon: Mail },
      { title: "Chat", url: "/chat", icon: MessageCircle },
    ]
  },
  {
    label: "Administración",
    managementOnly: true,
    items: [
      { title: "Equipos", url: "/teams", icon: UsersRound },
      { title: "Contactos", url: "/agenda", icon: Users },
      { title: "EPKs", url: "/epks", icon: FileImage },
      { title: "Calendario", url: "/calendar", icon: Calendar },
      { title: "Mi Perfil", url: "/contacts", icon: User },
      { title: "Ajustes", url: "/settings", icon: Settings },
    ]
  },
]
```

**Cambio 2: Badge de Solicitudes (pendientes)**

El sidebar importa `useActionCenter` con filtro mínimo (`status: ['pending', 'in_review']`) para obtener el `stats.pending`. Este dato alimenta el badge rojo sobre "Solicitudes" y el badge de "Booking" si hay booking requests pendientes.

El badge solo se renderiza si `count > 0` — nunca se muestra un "0" que es ruido.

```tsx
// En el renderNavItem, si el item tiene badge:
{badge && pendingCount > 0 && !isCollapsed && (
  <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center 
    rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
    {pendingCount > 99 ? '99+' : pendingCount}
  </span>
)}
// En collapsed, dot indicator:
{badge && pendingCount > 0 && isCollapsed && (
  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-destructive" />
)}
```

**Cambio 3: Presupuestos añadido al grupo Dinero**

`/budgets` actualmente no aparece en el sidebar — solo se llega desde el Dashboard o por URL directa. Al moverlo a grupo "Dinero" junto a Finanzas, se hace accesible y lógicamente agrupado.

**Cambio 4: collapsed mode — separadores entre grupos**

En modo colapsado (icono only), los grupos se separan con un `<Separator />` de 1px para mantener la agrupación visual incluso sin labels de texto.

## Resultado visual esperado

```text
EXPANDIDO                           COLAPSADO
┌────────────────────────────┐      ┌──────┐
│ 🏠 Dashboard               │      │  🏠  │
│                            │      │──────│
│ ARTISTAS                   │      │  🎵  │
│ 🎵 Mis Artistas            │      │  📁  │
│ 📁 Proyectos               │      │  💿  │
│ 💿 Discografía             │      │──────│
│                            │      │  🎤  │
│ OPERACIONES                │      │  🎬  │
│ 🎤 Booking                 │      │  🗺  │
│ 🎬 Sincronizaciones        │      │──────│
│ 🗺 Hojas de Ruta           │      │  💰  │
│                            │      │  🧮  │
│ DINERO                     │      │──────│
│ 💰 Finanzas                │      │  💾  │
│ 🧮 Presupuestos            │      │  📄  │
│                            │      │──────│
│ ARCHIVOS                   │      │  🔔 ③│ ← dot rojo
│ 💾 Drive                   │      │  📧  │
│ 📄 Documentos              │      │  💬  │
│                            │      └──────┘
│ COMUNICACIÓN               │
│ 🔔 Solicitudes         [3] │ ← badge rojo
│ 📧 Correo                  │
│ 💬 Chat                    │
└────────────────────────────┘
```

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/components/AppSidebar.tsx` | Reorganización completa de grupos + renombrado + badges |

**Sin tocar:** rutas, hooks, páginas, base de datos, `DashboardLayout`. Cambio puramente de presentación/navegación.

**Sin queries adicionales:** El badge usa `useActionCenter` con el estado en memoria existente.
