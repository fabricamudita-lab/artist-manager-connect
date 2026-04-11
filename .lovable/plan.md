

## Fix: Panel "Comprometido" no respeta el filtro de artista

### Problema
Al pulsar "Comprometido" con un filtro de artista activo, el `CashflowPanel` recibe `budgets` (todos los presupuestos) en lugar de los presupuestos filtrados por artista. Por eso aparecen pagos pendientes de otros artistas.

### Solución
En `src/pages/Budgets.tsx`, línea 1357, cambiar:

```typescript
budgets={budgets}
```

por:

```typescript
budgets={filterArtist === 'all' ? budgets : budgets.filter(b => b.artist_id === filterArtist)}
```

Un cambio de una sola línea. El panel mostrará solo los pagos del artista seleccionado.

