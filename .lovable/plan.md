
# Distinción por tipo de presupuesto: Concierto vs. Producción

## El problema

El diálogo `BudgetDetailsDialog.tsx` trata todos los presupuestos igual:
- Muestra "Caché:" en el encabezado y en la tarjeta CAPITAL para tipos de producción
- El resumen financiero (6 tarjetas) usa los mismos KPIs para todos los tipos
- Las categorías por defecto para producción usan íconos no registrados (`Camera`, `Clapperboard`, `Megaphone`, `Package`, `ShieldAlert`) que no están en `iconMap`, por lo que no se renderizan
- La creación de categorías por defecto no distingue `produccion_musical` de los demás tipos genéricos

## Tipos de presupuesto y su lógica

| Tipo | `budget.type` | Campo principal | KPIs clave |
|---|---|---|---|
| Concierto | `concierto` | **Caché** (lo que paga el promotor) | Caché → Gastos → Beneficio → Margen |
| Producción musical | `produccion_musical` | **Capital Aportado** + **Avance** | Total inversión → Ejecutado → Avance pagado → Saldo pendiente |
| Campaña promocional | `campana_promocional` | **Capital** | Total → Ejecutado → Presupuesto → Desviación |
| Videoclip | `videoclip` | **Capital** | Igual que campaña |
| Otros | `otros` | **Capital** | Genérico |

---

## Cambios en `BudgetDetailsDialog.tsx`

### 1. Corregir `iconMap` — añadir los íconos que faltan

```ts
// Línea ~162 — añadir al iconMap existente:
Camera: Camera,
Megaphone: Megaphone,  // → usar 'Sparkles' como alias si no existe
Package: Package,      // → usar 'FolderOpen' como alias
ShieldAlert: ShieldAlert,
Clapperboard: Clapperboard, // → usar 'Music' como alias si no existe
```

Se importarán desde `lucide-react` los que falten. Los que no existan en la versión instalada se mapearán a un sustituto visual cercano.

### 2. Corregir `RELEASE_DEFAULT_CATEGORIES` — nombres e íconos válidos

Basado en el documento adjunto (producción discográfica en sello, fases de producción):

```ts
const RELEASE_DEFAULT_CATEGORIES = [
  { name: 'Grabación',                icon_name: 'Music',      sort_order: 0  },
  { name: 'Mezcla y Mastering',       icon_name: 'Music',      sort_order: 1  },
  { name: 'Producción / Arreglos',    icon_name: 'Settings',   sort_order: 2  },
  { name: 'Diseño y Arte Visual',     icon_name: 'FileText',   sort_order: 3  },
  { name: 'Vídeo y Fotografía',       icon_name: 'FileText',   sort_order: 4  },
  { name: 'PR & Marketing',           icon_name: 'DollarSign', sort_order: 5  },
  { name: 'Distribución',             icon_name: 'CreditCard', sort_order: 6  },
  { name: 'Registro SGAE / AIE',      icon_name: 'FileText',   sort_order: 7  },
  { name: 'Transporte',               icon_name: 'Car',        sort_order: 8  },
  { name: 'Dietas y Alojamiento',     icon_name: 'Utensils',   sort_order: 9  },
  { name: 'Contingencia',             icon_name: 'Calculator', sort_order: 10 },
];
```

Todos los `icon_name` son valores que ya existen en `iconMap`.

### 3. Añadir categorías por defecto para Campaña y Videoclip

```ts
const CAMPAIGN_DEFAULT_CATEGORIES = [
  { name: 'Meta Ads (IG + FB)',       icon_name: 'DollarSign', sort_order: 0 },
  { name: 'TikTok Ads',               icon_name: 'DollarSign', sort_order: 1 },
  { name: 'Google Ads',               icon_name: 'DollarSign', sort_order: 2 },
  { name: 'Spotify (Marquee/Promo)',  icon_name: 'Music',      sort_order: 3 },
  { name: 'Prensa y PR',              icon_name: 'FileText',   sort_order: 4 },
  { name: 'Contenido y Creatividad',  icon_name: 'FileText',   sort_order: 5 },
  { name: 'Distribución',             icon_name: 'CreditCard', sort_order: 6 },
];

const VIDEOCLIP_DEFAULT_CATEGORIES = [
  { name: 'Dirección y Producción',   icon_name: 'FileText',   sort_order: 0 },
  { name: 'Equipo técnico',           icon_name: 'Lightbulb',  sort_order: 1 },
  { name: 'Localizaciones',           icon_name: 'Car',        sort_order: 2 },
  { name: 'Vestuario y Arte',         icon_name: 'FileText',   sort_order: 3 },
  { name: 'Postproducción',           icon_name: 'Settings',   sort_order: 4 },
  { name: 'Catering',                 icon_name: 'Utensils',   sort_order: 5 },
  { name: 'Varios',                   icon_name: 'Calculator', sort_order: 6 },
];
```

### 4. Actualizar `createDefaultCategories` para usar la constante correcta por tipo

```ts
const createDefaultCategories = async () => {
  const type = budget?.type;
  let defaultCategories;

  if (type === 'concierto') {
    defaultCategories = CONCERT_DEFAULT_CATEGORIES;
  } else if (type === 'produccion_musical') {
    defaultCategories = RELEASE_DEFAULT_CATEGORIES;
  } else if (type === 'campana_promocional') {
    defaultCategories = CAMPAIGN_DEFAULT_CATEGORIES;
  } else if (type === 'videoclip') {
    defaultCategories = VIDEOCLIP_DEFAULT_CATEGORIES;
  } else {
    defaultCategories = [
      { name: 'Gastos generales', icon_name: 'CreditCard', sort_order: 0 },
      { name: 'Comisiones',       icon_name: 'DollarSign', sort_order: 1 },
    ];
  }
  // ... resto igual
};
```

### 5. Nuevo estado: `avancePagado` (solo producción)

Los presupuestos de producción musical necesitan un campo adicional: **Avance** (parte del capital ya desembolsado). Se almacena en `budgets.metadata.avance_pagado` (sin migración de BD, ya existe la columna `metadata jsonb`).

```ts
const [avancePagado, setAvancePagado] = useState<number>(
  (budget.metadata as any)?.avance_pagado ?? 0
);
const [editingAvance, setEditingAvance] = useState(false);

const saveAvancePagado = async () => {
  const { data: current } = await supabase.from('budgets').select('metadata').eq('id', budget.id).single();
  await supabase.from('budgets').update({
    metadata: { ...(current?.metadata || {}), avance_pagado: avancePagado }
  }).eq('id', budget.id);
  setEditingAvance(false);
  onUpdate();
};
```

### 6. Encabezado diferenciado por tipo

El bloque de edición rápida (líneas 2550-2660) actualmente muestra siempre "Presupuesto:" y "Caché:". Se ajusta así:

**Para conciertos** (`budget.type === 'concierto'`):
- "Presupuesto:" → Gastos planificados (igual que ahora)
- "Caché:" → Fee del promotor (igual que ahora)

**Para producción** (`budget.type === 'produccion_musical'`):
- "Capital Aportado:" → `budgetAmount` (renombrado del `fee`)
- "Avance:" → `avancePagado` (nuevo campo editable en metadata)
- Quitar el campo "Presupuesto:" del header (ya queda en las tarjetas)

**Para campaña/videoclip/otros:**
- "Capital:" → `budgetAmount`
- "Presupuesto:" → `expenseBudget`

### 7. Resumen financiero diferenciado (las 6 tarjetas)

El bloque de 6 tarjetas (líneas 2729-2854) se envuelve en un `isConcert ? <ConciertSummary/> : <ProductionSummary/>` inline:

**Concierto** (igual que ahora):
CAPITAL | PRESUPUESTO | GASTOS REALES | TOTAL A FACTURAR | BENEFICIO | MARGEN

**Producción / Campaña / Videoclip:**
| Tarjeta | Valor | Color |
|---|---|---|
| TOTAL PRESUPUESTADO | `budgetAmount` | Azul |
| AVANCE PAGADO | `avancePagado` (solo producción) o `expenseBudget` | Ámbar |
| EJECUTADO | `totals.neto` | Neutro/Rojo si excede |
| TOTAL A FACTURAR | `totals.total` (con IVA/IRPF) | Primario |
| SALDO PENDIENTE | `budgetAmount - avancePagado` | Naranja |
| % EJECUTADO | `(totals.neto / budgetAmount) * 100` | Verde/Rojo |

Para campaña y videoclip (sin avance), el 2.º campo es "PRESUPUESTO PLANIF." con `expenseBudget`.

---

## Criterio de la industria (documento adjunto)

Las fases del documento (B1-B4) confirman la estructura de un presupuesto de producción/campaña:
- **Capital Aportado**: puede ser del artista, sello o distribuidora. Parte a devolver, parte a fondo perdido (ej. marketing).
- **Avance**: pago inicial que recibe el artista/productor al comenzar, antes de que existan facturas reales.
- Las categorías de producción discográfica del documento (Grabación, Mezcla, Mastering, Marketing, Distribución, Registro SGAE/AIE) se mapean directamente a las categorías por defecto propuestas.

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/components/BudgetDetailsDialog.tsx` | Íconos, categorías por defecto por tipo, encabezado diferenciado, tarjetas financieras diferenciadas, estado `avancePagado` |

Sin tocar: base de datos (se usa `metadata` jsonb ya existente), migraciones, otros archivos.
