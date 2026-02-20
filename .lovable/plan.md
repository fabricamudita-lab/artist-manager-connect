
# Mejoras al diálogo de presupuesto (BudgetDetailsDialog)

## Cambios propuestos — 4 puntos

---

### 1. Categorías cerradas por defecto al abrir

**Problema:** Al abrir el diálogo, todas las categorías se despliegan automáticamente, lo que hace difícil obtener una vista general rápida.

**Solución:** Inicializar `openCategories` como un `Set` vacío en lugar de uno con todos los IDs. Las categorías arrancarán cerradas; el usuario las abre haciendo clic como ya funciona hoy.

- Líneas afectadas: `538` y `567` en `BudgetDetailsDialog.tsx`
- Se cambia `new Set(data.map(c => c.id))` → `new Set()`

---

### 2. Ocultar / mostrar categorías individualmente

**Problema:** No hay forma de quitar de la vista categorías que no se usan ahora, sin eliminarlas.

**Solución:** Añadir un nuevo estado local `hiddenCategories: Set<string>` y un botón de ojo (`Eye` / `EyeOff`) en la cabecera de cada categoría. Las categorías ocultas no aparecen en la lista principal, pero sí en un acordeón colapsado al final llamado **"Categorías ocultas (N)"**, donde el usuario puede volver a mostrarlas.

```
[↕] [🎵] ARTISTA PRINCIPAL  (0 elementos)  Neto €0,00  Total €0,00  [👁] [+ Agregar]
```

El estado `hiddenCategories` se guarda solo en memoria (dura hasta que se cierra el diálogo); no requiere cambios en base de datos.

---

### 3. Eliminar la etiqueta "PRESUPUESTO NACIONAL / INTERNACIONAL" del subheader

**Problema:** El usuario tiene razón — esa terminología (nacional/internacional) pertenece al ámbito de booking (tarifa nacional vs. tarifa internacional). Para un presupuesto de lanzamiento no tiene sentido.

**Solución sencilla:** Eliminar directamente la línea `PRESUPUESTO {budget_status?.toUpperCase() || 'NACIONAL'}` del subheader. El `budget_status` seguirá existiendo en la base de datos (lo necesita el sistema de booking para cargar tarifas), pero dejará de mostrarse como etiqueta prominente en el diálogo de presupuesto.

- Línea afectada: `2441` en `BudgetDetailsDialog.tsx`
- Solo se elimina el texto de UI, sin cambios en la lógica ni en la base de datos.

---

### 4. Renombrar "Caché" → "Capital" (con tooltip explicativo)

**Problema:** "Caché" es el cobro de un artista en un booking. En un presupuesto de lanzamiento, la fuente de dinero puede ser el artista, el sello o la distribuidora, y parte puede ser a fondo perdido (marketing) y parte a devolver.

**Solución pragmática:** Renombrar la etiqueta `CACHÉ` → `CAPITAL` en la tarjeta de ingresos del resumen financiero, y cambiar el subtexto de `Ingresos` a `Capital aportado`. Se añade un tooltip pequeño que aclara: _"Fondos disponibles (caché, sello, distribuidora, etc.)"_.

Esto es un cambio de nomenclatura en la UI únicamente. La columna de base de datos (`fee`) y la lógica de comisiones no se tocan.

```
╔══════════════════════╗
║  CAPITAL             ║
║  €0,00               ║
║  Capital aportado ℹ  ║
╚══════════════════════╝
```

El tooltip `ℹ` mostrará: _"Puede incluir caché del artista, aportación del sello o distribuidora. Parte puede ser a devolver y parte a fondo perdido (ej. marketing)."_

---

## Archivos a modificar

| Archivo | Cambios |
|---|---|
| `src/components/BudgetDetailsDialog.tsx` | 4 cambios: inicialización de `openCategories`, estado `hiddenCategories`, botón ocultar por categoría, etiqueta "NACIONAL" y tarjeta "CACHÉ" |

Sin cambios en base de datos, sin nuevos archivos, sin migraciones.
