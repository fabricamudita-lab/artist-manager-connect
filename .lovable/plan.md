## Problema

En la sección "Canciones y Autoría" del detalle de lanzamiento aparece de forma permanente un banner amarillo:

> ⚠ Renumerar afectará a 5 elemento(s) vinculado(s) (pitches o borradores).

Se muestra siempre, incluso sin haber pulsado nada. Esto genera ruido visual y confunde, porque parece un aviso de un problema cuando en realidad solo describe lo que pasaría *si* se pulsa "Renumerar".

## Solución

Mostrar ese aviso **solo dentro del diálogo de confirmación** de renumerar/reordenar (donde ya aparece), no de forma permanente sobre la lista de canciones.

### Cambio concreto

En `src/pages/release-sections/ReleaseCreditos.tsx`:

- Eliminar el bloque (líneas ~633-640) que renderiza `<ReorderImpactNotice>` debajo del `CardHeader`.
- Mantener intacta la instancia que ya existe dentro del `AlertDialog` de confirmación de renumerar (línea ~860), que es donde tiene sentido informar del impacto justo antes de confirmar.
- Mantener también el hook `useReorderImpact` y la recarga `getReorderImpact` previa a la acción, ya que se siguen usando dentro del diálogo.

### Resultado

- La cabecera de "Canciones y Autoría" queda limpia: solo el título y los botones "Renumerar" y "Cambiar orden".
- Al pulsar "Renumerar", el diálogo de confirmación sigue mostrando claramente cuántos elementos vinculados se verían afectados antes de confirmar.
