## Plan: mejorar el seguimiento del auto-scroll de letras

### Diagnóstico
Ahora mismo el panel de letra hace un scroll totalmente lineal:

```text
posición de scroll = progreso de audio / duración total
```

Eso funciona visualmente, pero no siempre sigue la letra real porque las canciones no reparten las frases de forma uniforme: puede haber intros, pausas, versos rápidos, bloques densos o finales instrumentales. En el enlace que compartes, por ejemplo, la letra tiene tramos con muchas palabras seguidas y otros más cortos, por eso a veces el texto “va más deprisa” que el scroll.

### Solución propuesta
Mejorar el auto-scroll para que sea más inteligente sin necesitar timestamps manuales:

1. **Dividir la letra por líneas reales**
   - En vez de tratar la letra como un bloque único, renderizar cada línea en elementos separados.
   - Mantener los saltos vacíos para conservar el formato visual.

2. **Crear una estimación de ritmo por línea**
   - Calcular un “peso” para cada línea según su cantidad de palabras/caracteres.
   - Las líneas con más texto ocuparán más tiempo estimado.
   - Las líneas vacías o muy cortas ocuparán menos tiempo.

3. **Compensar intros y finales**
   - Añadir una pequeña compensación automática para no empezar a bajar demasiado pronto si hay intro.
   - Reservar un margen al final para evitar que el scroll llegue abajo demasiado pronto.

4. **Scroll hacia la línea activa, no hacia un porcentaje bruto**
   - A partir del `currentTime`, calcular qué línea debería estar activa.
   - Hacer scroll para mantener esa línea cerca del centro/superior cómodo del panel.
   - Resaltar sutilmente la línea activa para que se entienda qué parte está siguiendo.

5. **Mantener lectura libre**
   - El botón actual de activar/desactivar auto-scroll seguirá igual.
   - Si el usuario hace scroll manual, se respetará y no se peleará con la lectura.

### Cambios técnicos
| Archivo | Cambio |
|---|---|
| `src/components/releases/SharedReleaseTrackPanel.tsx` | Reemplazar el auto-scroll proporcional por un sistema basado en líneas ponderadas. Añadir refs por línea, cálculo de línea activa y scroll centrado suave. Renderizar la letra línea a línea con highlight discreto. |

### Resultado esperado
- La letra seguirá mejor el ritmo percibido de la canción, especialmente en partes densas.
- El scroll no bajará “por bajar” de forma tan mecánica.
- La experiencia seguirá siendo simple: abrir letra, reproducir y verla avanzar.
- No requiere cambios de base de datos ni edición manual de timestamps.

### Nota
Esto seguirá siendo una sincronización estimada. Para precisión tipo karaoke perfecta haría falta guardar timestamps por línea, pero esta mejora debería sentirse mucho más natural con las letras existentes.