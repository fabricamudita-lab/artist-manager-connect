
# Hacer colapsable la card de Estado de Carrera

Convertir la card "Estado de Carrera" en un componente colapsable. Cuando este minimizada, solo mostrara una linea con el titulo y el badge del estado actual. Cuando este expandida, mostrara la barra de progreso y las etiquetas como ahora.

## Cambio en `src/pages/ArtistProfile.tsx`

Envolver el contenido de la card con `Collapsible` de Radix (ya instalado y disponible en `@/components/ui/collapsible`):

- **Siempre visible**: Fila con icono, texto "Estado de Carrera", badge con la fase actual, y boton de toggle (ChevronDown/ChevronUp)
- **Colapsable**: La barra de progreso (`Progress`) y las etiquetas de fases
- **Estado inicial**: Colapsado (minimizado), mostrando solo "Estado de Carrera - Descubrimiento"

### Estructura resultante

```text
[Card]
  [Collapsible]
    [Trigger row]  Icono + "Estado de Carrera" + Badge("Descubrimiento") + chevron
    [CollapsibleContent]
      Progress bar
      Phase labels
```

### Imports adicionales
- `Collapsible, CollapsibleContent, CollapsibleTrigger` desde `@/components/ui/collapsible`
- `ChevronDown` desde `lucide-react`
- `useState` para controlar el estado abierto/cerrado

| Archivo | Lineas afectadas |
|---|---|
| `src/pages/ArtistProfile.tsx` | ~399-421 (card de Estado de Carrera) |
