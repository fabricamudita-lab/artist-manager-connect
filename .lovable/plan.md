

## Plan: arreglar el hueco superior en la pestaña Créditos

### Problema
En el panel lateral del enlace público, al abrir la pestaña **Créditos** el contenido aparece pegado a la mitad/inferior del panel en lugar de empezar justo debajo de la barra de pestañas. La causa está en `SharedReleaseTrackPanel.tsx`: el `TabsContent` de créditos usa `flex-1` + `overflow-y-auto` pero el contenido interno no se ancla arriba, y combinado con el `gap-4` del `SheetContent` y `mt-3` el layout deja un espacio vacío grande arriba.

### Solución
Reorganizar el layout interno del `Sheet` para que:
- El contenedor de scroll de Créditos empiece **inmediatamente debajo** del `TabsList`.
- El contenido se ancle arriba (`items-start` / sin reverse), sin huecos.
- Misma corrección preventiva en el `TabsContent` de Letra para mantener coherencia.

### Cambios concretos
| Archivo | Cambio |
|---|---|
| `src/components/releases/SharedReleaseTrackPanel.tsx` | Ajustar el contenedor `Tabs`: añadir `gap-0` y reducir `mt-3` a `mt-2`. En el `TabsContent` de créditos, envolver el contenido en un wrapper `h-full overflow-y-auto` y mover el scroll allí, asegurando que el `space-y-4` empiece desde arriba (`pt-3`). Eliminar cualquier `flex` innecesario que esté forzando el contenido hacia abajo. Hacer lo mismo en el `TabsContent` de Letra para consistencia. |

### Resultado esperado
- Al abrir **Créditos**, las secciones (Compositor, Autoría, etc.) aparecen justo debajo de las pestañas, sin hueco vacío.
- La pestaña **Letra** sigue funcionando con su auto-scroll y barra de control arriba.
- Sin cambios en datos, lógica de agrupación ni RLS.

