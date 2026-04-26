## Problema

El popover de hito muestra `Anclado a: c4f538db-08cc-43ca-83a4-69edd906075b` (UUID en bruto). Hay que mostrar el **título del hito** al que está anclado.

## Cambios

### `src/components/calendar/MilestoneDayPopover.tsx`

1. **Normalizar `anchoredTo`** a un array de IDs (puede venir como string o `string[]` según la fuente).
2. **Resolver IDs → títulos** con un `useEffect` que consulta `release_milestones` cuando cambian los anchorIds:
   ```ts
   const [anchorTitles, setAnchorTitles] = useState<Record<string, string>>({});
   useEffect(() => {
     if (!anchoredIds.length) return;
     supabase.from('release_milestones')
       .select('id, title')
       .in('id', anchoredIds)
       .then(({ data }) => {
         setAnchorTitles(Object.fromEntries((data || []).map(m => [m.id, m.title])));
       });
   }, [anchoredIds.join(',')]);
   ```
3. **Render**: para cada id, mostrar el título resuelto. Si todavía no se ha resuelto, mostrar `Cargando…`. Si tras la consulta no se encuentra (anclaje huérfano), mostrar `Hito eliminado` en cursiva. Nunca mostrar el UUID al usuario.
   ```tsx
   {data.anchoredIds.length > 0 && (
     <p className="flex items-start gap-1.5 text-muted-foreground">
       <Anchor className="h-3.5 w-3.5 mt-0.5 shrink-0" /> Anclado a:{' '}
       <span className="text-foreground">
         {data.anchoredIds.map(id => anchorTitles[id] ?? (loaded ? 'Hito eliminado' : 'Cargando…')).join(', ')}
       </span>
     </p>
   )}
   ```

## Fuera de alcance

No tocamos cómo se guarda `anchoredTo` en BD ni la página de cronograma. Solo se mejora la visualización en el popover del calendario.
