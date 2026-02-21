
# Mejoras al Perfil del Artista (ArtistProfile.tsx)

5 cambios aditivos que mejoran la jerarquia visual y la utilidad del perfil sin eliminar nada del codigo existente.

---

## 1. Card de "Estado de Carrera" con fase actual

Una card nueva justo debajo del header que calcula automaticamente la fase del artista basandose en los datos existentes:

| Fase | Condicion |
|---|---|
| Descubrimiento | 0 releases, 0-2 shows |
| Construccion | 1-3 releases O 3-10 shows |
| Consolidacion | 4+ releases O 10+ shows O ingresos > 5000 |
| Expansion | 10+ releases O 20+ shows O ingresos > 20000 |

Se muestra como una barra de progreso con 4 segmentos y un badge con la fase actual. La logica es un `useMemo` que evalua `releases.length`, `bookings.length` y `totalRevenue`.

### Aspecto visual

```
[=========>                    ]  Construccion
 Descubrimiento  Construccion  Consolidacion  Expansion
```

Una `Progress` bar con el porcentaje mapeado (25/50/75/100) y labels debajo.

---

## 2. Metricas en 0 mostradas diferente

Las stats cards con valor 0 (o "0") se renderizan con estilo atenuado y un boton "+" en lugar del numero grande:

- Si `stat.value === 0` o `stat.value === '0'`:
  - Fondo mas tenue (`opacity-60`)
  - En lugar del "0" grande, un boton `+ Crear` que navega a la ruta correspondiente
- Si tiene valor: se muestra exactamente como ahora

No se elimina ninguna card, solo cambia la presentacion visual.

---

## 3. Reordenar tabs por frecuencia de uso

Cambiar el orden de las tabs de:
```
Equipo | Shows | Proyectos | Releases | Solicitudes | Finanzas
```
a:
```
Shows | Finanzas | Releases | Equipo | Proyectos | Solicitudes
```

Y cambiar el `defaultValue` de `"team"` a `"bookings"`.

Solo se reordenan los `TabsTrigger` y los `TabsContent` correspondientes. El contenido de cada tab no cambia.

---

## 4. Header del artista con bio rapida y links sociales

Expandir el header actual (lineas 281-302) para incluir:

- **Genero musical**: badge junto al nombre si `artist.genre` existe
- **Descripcion corta**: 1-2 lineas directamente en el header (no en una card separada). Si no hay descripcion, mostrar un boton sutil "Anadir descripcion" que abre el `ArtistInfoDialog`
- **Links sociales**: iconos clickables de Spotify, Instagram, TikTok si las URLs existen en la BD. Si no hay ninguno, mostrar "Anadir redes" como link sutil

Esto requiere ampliar la query del artista (linea 100) para incluir `genre, spotify_url, instagram_url, tiktok_url, avatar_url` en el `select('*')` (ya lo hace porque usa `*`). Solo hay que ampliar la interfaz `Artist` para incluir estos campos.

La card separada de descripcion (lineas 305-311) se elimina porque la bio ahora vive en el header. **Nota**: la card no se "elimina" del codigo, se condiciona para no renderizar cuando la descripcion ya se muestra en el header (siempre).

---

## 5. Desglose de ingresos en la card de finanzas (stats)

La card "Ingresos totales" (6a posicion en stats) actualmente muestra solo el total de booking fees. Se enriquece con un mini donut chart inline:

- Se calcula el desglose: **Booking** (fees de `booking_offers`), **Royalties** (de `platform_earnings` via `useRoyalties`), **Sync** (placeholder 0 por ahora)
- La card muestra el total arriba y un mini `PieChart` de recharts (40x40px) con 2-3 segmentos de colores
- Si solo hay un tipo de ingreso, no se muestra el donut (solo el total)

Se necesita importar `usePlatformEarnings` y `useSongs` de `useRoyalties.ts` para obtener los earnings del artista. Los datos ya existen en la BD.

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/pages/ArtistProfile.tsx` | Interfaz Artist ampliada, header con bio/links, card de fase de carrera, stats cards con estilo diferenciado para 0s, tabs reordenadas, desglose de ingresos con mini donut |

No se tocan otros archivos. No se necesitan migraciones.
