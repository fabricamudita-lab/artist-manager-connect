

# Barra consolidada por lanzamiento en la fila de cabecera

## Cambio

Actualmente la fila de cabecera de cada release solo muestra el nombre y el badge de progreso. Se anadira una barra consolidada que abarca desde la primera tarea hasta la ultima de todos los flujos combinados, visible directamente en la fila del release (cuando esta colapsado o expandido). Asi de un vistazo se ve el rango temporal completo de cada lanzamiento.

## Como se vera

- La fila de cabecera del release pasa a tener dos zonas: la columna izquierda (nombre, icono, badge) y la columna derecha (timeline) con la barra consolidada
- La barra consolidada usa un color neutro/primario y muestra el progreso (completadas/total) como relleno interno
- Al expandir, debajo aparecen las filas individuales por workflow como hasta ahora

## Detalle tecnico

### Archivo: `src/components/releases/AllCronogramasView.tsx`

1. **Calcular rango global del release**: a partir de los `summaries`, obtener `releaseStart = min(wf.startDate)` y `releaseEnd = max(wf.endDate)` 
2. **Cambiar layout del header**: convertir la fila de cabecera de un simple `flex items-center` a un layout de dos columnas igual que las filas de workflow (columna izquierda de 256px + columna derecha flex-1 con timeline)
3. **Renderizar barra consolidada** en la columna derecha del header usando `getBarStyle(releaseStart, releaseEnd)`, con color basado en el estado dominante global y una barra de progreso interna
4. **Mover el badge** a la columna izquierda (ya esta ahi, solo ajustar que quede bien con el nuevo layout)
5. **Anadir tooltip** a la barra consolidada mostrando rango de fechas y progreso total

