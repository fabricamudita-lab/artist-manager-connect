
# Mejora de visibilidad: Sección "Categorías ocultas" más intuitiva

## Diagnóstico

El trigger actual es casi invisible: texto gris pequeño uppercase (`text-xs font-semibold uppercase tracking-wider text-gray-400`) sobre un fondo gris oscuro (`bg-gray-700/50`). No hay ninguna señal visual que invite a interactuar con él.

## Cambios propuestos (un solo archivo, líneas 3122–3129)

### 1. Separador visual antes de la sección
Añadir un `<Separator />` con una etiqueta descriptiva antes del `Collapsible`, para crear una separación clara entre "categorías activas" y "categorías ocultas".

### 2. Rediseño del trigger
Convertir el trigger de texto gris invisible a un elemento visualmente diferenciado:

**Antes (actual):**
```tsx
<CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors text-xs font-semibold uppercase tracking-wider">
  <div className="flex items-center gap-2">
    <EyeOff className="w-3.5 h-3.5" />
    <span>Categorías ocultas ({hiddenCategories.size})</span>
  </div>
  <ChevronDown className="w-3.5 h-3.5 ..." />
</CollapsibleTrigger>
```

**Después (propuesto):**
```tsx
<CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-dashed border-gray-600 hover:border-gray-500 bg-gray-800/60 hover:bg-gray-800 text-gray-300 hover:text-white transition-all group">
  <div className="flex items-center gap-3">
    <div className="w-7 h-7 rounded-md bg-gray-700 group-hover:bg-gray-600 flex items-center justify-center transition-colors">
      <EyeOff className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-200" />
    </div>
    <div className="text-left">
      <div className="text-sm font-medium">Categorías ocultas</div>
      <div className="text-xs text-gray-500">
        {hiddenCategories.size} {hiddenCategories.size === 1 ? 'categoría' : 'categorías'} · haz clic para ver y restaurar
      </div>
    </div>
  </div>
  <div className="flex items-center gap-2">
    <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-300">
      {hiddenCategories.size}
    </Badge>
    <ChevronDown className="w-4 h-4 transition-transform [[data-state=open]_&]:rotate-180 text-gray-500" />
  </div>
</CollapsibleTrigger>
```

### 3. Añadir icono de ojo tachado por fila en la lista de ocultas
Cada fila de la lista colapsada muestra el icono de la categoría en gris. Añadir también un pequeño `EyeOff` como indicador visual de su estado oculto, junto al nombre.

## Resultado visual esperado

```text
┌─────────────────────────────────────────────────────────┐
│  Producción         4 elementos   Seleccionar   ✏  🗑  │
│  Grabación          5 elementos   Seleccionar   ✏  🗑  │
│  ...                                                    │
│                                                         │
│  ┌ - - - - - - - - - - - - - - - - - - - - - - - - ─ ┐ │  ← borde punteado diferenciador
│  │  👁‍🗨  Categorías ocultas              [11]  ▼      │ │
│  │      11 categorías · haz clic para ver y restaurar  │ │
│  └ - - - - - - - - - - - - - - - - - - - - - - - - ─ ┘ │
│                                                         │
│  [+ Agregar Nueva Categoría]                            │
└─────────────────────────────────────────────────────────┘
```

Cuando se despliega:
```text
│  ┌ - - - - - - - - - - - - - - - - - - - - - - - ─ ┐  │
│  │  👁‍🗨  Categorías ocultas              [11]  ▲   │  │
│  │      11 categorías · haz clic para ver y restaurar │  │
│  ├─────────────────────────────────────────────────┤  │
│  │  🎵  Artista Principal   (3 elementos)  [Mostrar] │  │
│  │  👥  Músicos             (5 elementos)  [Mostrar] │  │
│  │  🔧  Equipo técnico      (2 elementos)  [Mostrar] │  │
│  └──────────────────────────────────────────────── ┘  │
```

## Archivo afectado

| Archivo | Líneas | Cambio |
|---|---|---|
| `src/components/BudgetDetailsDialog.tsx` | 3122–3129 | Rediseño del CollapsibleTrigger |

Import adicional: `Badge` de `@/components/ui/badge` (ya importado en el archivo).

Sin cambios en base de datos. Sin nuevos archivos.
