# Plan: Separar Publishing y Master en porcentajes independientes - ✅ COMPLETADO

## Implementación Realizada

### Base de Datos
- ✅ Añadidas columnas `publishing_percentage` y `master_percentage` a `track_credits`
- ✅ Migrados datos existentes según el rol del colaborador

### Código Actualizado
- ✅ `src/hooks/useReleases.ts` - Interfaz `TrackCredit` con nuevos campos
- ✅ `src/components/releases/TrackRightsSplitsManager.tsx` - Usa columna correcta según tipo (publishing/master)
- ✅ `src/pages/release-sections/ReleaseCreditos.tsx` - Muestra/edita ambos porcentajes con badges diferenciados

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

## Flujo de Usuario

1. **En Créditos**: Usuario añade colaboradores con % Autoría y/o % Master independientes
2. **En Presupuestos > Autoría**: Solo aparecen créditos con `publishing_percentage > 0`
3. **En Presupuestos > Master**: Solo aparecen créditos con `master_percentage > 0`

Cada "tarta" suma 100% de forma independiente.
