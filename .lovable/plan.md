
## Corrección del toast repetitivo en Pitch

### Problema exacto
Sí, ya sé qué está pasando. El bucle está en `src/pages/release-sections/ReleasePitch.tsx`:
- el estado local se hidrata convirtiendo `null` de la base de datos en `''`
- el autosave compara esos valores sin normalizarlos
- para React, `'' !== null`, así que detecta cambios aunque no exista ninguno real
- eso dispara `updateRelease.mutate(...)`
- `useUpdateRelease` en `src/hooks/useReleases.ts` invalida queries y muestra `toast.success('Lanzamiento actualizado')`
- al refetchear, el formulario se vuelve a hidratar y el ciclo arranca otra vez

### Riesgos presentes y futuros
- spam continuo de notificaciones
- escrituras innecesarias en Supabase
- posible reseteo del formulario mientras el usuario está editando
- el mismo patrón puede generar guardados fantasma en `PublicReleaseForm.tsx`

### Plan
1. **Blindar el autosave en `ReleasePitch.tsx`**
   - normalizar valores antes de comparar (`null`, `undefined` y `''` deben equivaler)
   - no guardar en la primera hidratación del formulario
   - enviar solo campos realmente modificados

2. **Evitar rehidrataciones destructivas**
   - inicializar `localData` desde `release` solo cuando toque
   - no resetear el formulario en cada refetch si el usuario ya empezó a editar

3. **Silenciar los autosaves**
   - ampliar `useUpdateRelease` para soportar una opción tipo `silent` o `showToast`
   - mantener toast en acciones manuales
   - desactivarlo para guardados automáticos del Pitch

4. **Revisar también `PublicReleaseForm.tsx`**
   - aplicar la misma comparación normalizada
   - evitar updates automáticos al abrir el formulario si aún no hubo cambios reales

### Archivos afectados
- `src/pages/release-sections/ReleasePitch.tsx`
- `src/hooks/useReleases.ts`
- `src/pages/PublicReleaseForm.tsx`

### Resultado esperado
- deja de aparecer “Lanzamiento actualizado” en bucle
- el Pitch solo guarda cuando hay cambios reales
- no se pisan datos durante la edición
- el formulario público queda protegido contra el mismo problema
