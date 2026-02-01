
# Plan: Separar Publishing y Master en porcentajes independientes

## Problema Actual

La tabla `track_credits` usa una sola columna `percentage` para ambos conceptos. Esto significa que si alguien tiene "20% del Master", el sistema lo interpreta como 20% del total, cuando en realidad son dos tartas separadas:

- **Publishing (Derechos de Autor)**: Debe sumar 100% por separado
- **Master (Royalties)**: Debe sumar 100% por separado

## Solución

Añadir dos columnas de porcentaje separadas a la tabla `track_credits`:

| Columna | Descripción |
|---------|-------------|
| `publishing_percentage` | % sobre el 100% de derechos de autor |
| `master_percentage` | % sobre el 100% de royalties master |

La columna actual `percentage` se puede mantener temporalmente para compatibilidad o eliminar después de la migración.

## Arquitectura Final

```text
                      track_credits
┌─────────────────────────────────────────────────────────────┐
│ id, track_id, contact_id, name, role                        │
│ publishing_percentage (0-100)  ← Para Autoría               │
│ master_percentage (0-100)      ← Para Royalties             │
└─────────────────────────────────────────────────────────────┘

     CRÉDITOS                Publishing (100%)    Master (100%)
┌────────────────┐          ┌──────────────┐    ┌──────────────┐
│ Juan - Letrista│    →     │ Juan: 50%    │    │              │
│ Ana - Productor│    →     │              │    │ Ana: 60%     │
│ Pedro - Comp.  │    →     │ Pedro: 50%   │    │              │
│ Sello XYZ      │    →     │              │    │ Sello: 40%   │
└────────────────┘          └──────────────┘    └──────────────┘
                               Total: 100%        Total: 100%
```

## Cambios en Base de Datos

**Migración SQL:**
```sql
-- Añadir nuevas columnas
ALTER TABLE track_credits 
  ADD COLUMN publishing_percentage NUMERIC DEFAULT NULL,
  ADD COLUMN master_percentage NUMERIC DEFAULT NULL;

-- Migrar datos existentes según el rol
UPDATE track_credits 
SET publishing_percentage = percentage 
WHERE role IN ('compositor', 'letrista', 'co-autor', 'arreglista', 'editorial');

UPDATE track_credits 
SET master_percentage = percentage 
WHERE role IN ('productor', 'interprete', 'intérprete', 'vocalista', 'featured', 'sello', 'mezclador', 'masterizador', 'musico_sesion');
```

## Cambios en Código

### 1. Actualizar interfaz `TrackCredit` (useReleases.ts)

Añadir las nuevas propiedades:
```typescript
export interface TrackCredit {
  id: string;
  track_id: string;
  contact_id: string | null;
  name: string;
  role: string;
  percentage: number | null; // Deprecated
  publishing_percentage: number | null; // NUEVO
  master_percentage: number | null;     // NUEVO
  notes: string | null;
  created_at: string;
}
```

### 2. Actualizar `TrackRightsSplitsManager.tsx`

- Cambiar la lectura/escritura para usar `publishing_percentage` o `master_percentage` según el tipo
- El filtro ya no necesita comprobar rol, solo si el porcentaje correspondiente existe:

```typescript
const splits = useMemo(() => {
  const percentageKey = type === 'publishing' ? 'publishing_percentage' : 'master_percentage';
  return allCredits.filter(credit => credit[percentageKey] !== null && credit[percentageKey] > 0);
}, [allCredits, type]);
```

### 3. Actualizar `ReleaseCreditos.tsx`

- Mostrar ambos porcentajes si existen (con badges diferenciados)
- Permitir editar ambos porcentajes desde la sección de créditos
- Ejemplo: "Juan - Letrista [50% Autoría] [30% Master]"

### 4. Regenerar tipos de Supabase

Después de la migración, regenerar `src/integrations/supabase/types.ts` para que incluya las nuevas columnas.

## Flujo de Usuario Final

1. **En Créditos**: Usuario añade "Juan" como "Compositor" con 50% de Publishing y 0% de Master
2. **En Presupuestos > Publishing**: Ve "Juan - Compositor: 50%" (de 100% Publishing)
3. **En Presupuestos > Master**: No aparece Juan porque tiene 0% Master
4. Si añade a "Ana" como "Productor" con 60% Master, aparece solo en la pestaña Master

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| Migración SQL | Añadir `publishing_percentage` y `master_percentage` |
| `src/integrations/supabase/types.ts` | Regenerar con nuevas columnas |
| `src/hooks/useReleases.ts` | Actualizar interfaz `TrackCredit` |
| `src/components/releases/TrackRightsSplitsManager.tsx` | Usar porcentaje correcto según tipo |
| `src/pages/release-sections/ReleaseCreditos.tsx` | Mostrar/editar ambos porcentajes |
| `src/lib/creditRoles.ts` | Sin cambios (roles ya correctos) |

## Beneficios

- **Claridad**: 100% Publishing + 100% Master = gestión correcta de derechos
- **Flexibilidad**: Un colaborador puede participar en ambos (ej: artista-compositor)
- **Sincronización**: Editar en cualquier sección actualiza la misma fila
