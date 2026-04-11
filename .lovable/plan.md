
Diagnóstico: el aviso entra en bucle por dos motivos combinados en `src/pages/release-sections/ReleasePresupuestos.tsx`.

1. `metadata.variables.n_tracks` es un único valor guardado en el presupuesto, pero ese presupuesto ahora está compartido entre varios releases. La comprobación actual lo compara solo contra `tracks?.length` del release abierto, así que en un presupuesto espejo la comparación es conceptualmente incorrecta.
2. `resolveTrackCount()` muestra toast de éxito aunque la actualización falle, porque no comprueba `error` en el `update()` de Supabase.

En este caso concreto, el presupuesto compartido `"Presupuesto - ChromatisM + Nox + Hobba"` tiene `n_tracks = 3`, mientras que el release actual tiene 1 track y además el presupuesto está vinculado a otros releases. Por eso el aviso no tiene una “salida estable” con la lógica actual.

Plan de implementación:

1. Ajustar el modelo en pantalla para presupuestos compartidos
- En `fetchLinkedBudgets`, además de `metadata`, traer también `release_id`.
- Construir para cada presupuesto la lista completa de releases asociados: release principal (`budgets.release_id`) + extras de `budget_release_links`.
- Calcular también el nº de tracks por release vinculado.

2. Crear una única regla de “track count esperado”
- Añadir helper tipo `getExpectedTrackCount(budget)`.
- Si el presupuesto es normal: esperado = tracks del release actual.
- Si el presupuesto es compartido: esperado = suma de tracks de todos los releases vinculados al mismo presupuesto.
- Normalizar a número con `Number(...)` para evitar falsos positivos por tipos.

3. Corregir el warning para que no compare mal
- Cambiar la generación de warnings `track_count` para usar `getExpectedTrackCount(budget)`.
- Cambiar el texto cuando sea compartido, por ejemplo:
  - `El presupuesto tiene 3 canciones, pero los releases vinculados suman 4`
  - detalle con los releases implicados si hace falta.
- Así el aviso dejará de reaparecer por comparar un presupuesto compartido contra un solo release.

4. Corregir el botón “Actualizar presupuesto”
- En `resolveTrackCount`, actualizar `metadata.variables.n_tracks` al valor esperado real (individual o combinado según el caso).
- Comprobar explícitamente `const { error } = await ...update(...)`; si hay error, lanzar excepción y no mostrar éxito falso.
- Solo mostrar el toast de éxito cuando la escritura haya terminado bien.
- Refrescar `fetchLinkedBudgets()` al terminar.

5. Mejorar feedback para presupuestos espejo
- Si el presupuesto está compartido, cambiar el copy del botón/acción para que quede claro que actualizará el total compartido, no solo el release abierto.
- Esto evita confusión con el comportamiento espejo.

Archivos a tocar:
- `src/pages/release-sections/ReleasePresupuestos.tsx`

Detalles técnicos:
- No hace falta migración.
- La clave es dejar de tratar `n_tracks` como “tracks del release actual” cuando el presupuesto pertenece a varios releases.
- Además, hay que eliminar el falso positivo de éxito revisando `error` en Supabase antes del toast.
