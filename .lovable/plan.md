

# Mostrar artistas en la vista "Ver todo" de Equipos

Actualmente los artistas principales solo aparecen cuando se selecciona un equipo especifico. En la vista "Ver todo", no se incluyen porque la logica solo los inyecta cuando hay un artista seleccionado individualmente.

---

## Causa

En `allTeamByCategory` (linea 832), la condicion es:

```text
if (selectedArtist && ...) { artistAsMember = ... }
```

Cuando `selectedArtistId === 'all'`, `selectedArtist` es `null`, asi que nunca se crean las entradas de artista.

## Solucion

Modificar la logica en `src/pages/Teams.tsx` para que, cuando el filtro sea "Ver todo" (`selectedArtistId === 'all'`), se inyecten TODOS los artistas en la categoria `artistico` o `banda`. Se iterara sobre el array `artists` y se creara una entrada por cada artista.

### Cambio concreto

En el bloque `allTeamByCategory` (lineas 832-841), reemplazar la logica de `artistAsMember` unico por un array `artistMembers`:

- Si `selectedArtistId === 'all'` y la categoria es `artistico` o `banda`: inyectar todos los artistas del array `artists`
- Si hay un artista seleccionado: mantener el comportamiento actual (inyectar solo ese artista)
- Ajustar el calculo de `total` para sumar `artistMembers.length` en vez de 1
- Ajustar `buildGridMembers` para iterar sobre el array de artistas en vez de un unico `artistMember`

---

## Archivo afectado

| Archivo | Cambio |
|---|---|
| `src/pages/Teams.tsx` | Inyectar todos los artistas en "Ver todo", adaptar `allTeamByCategory` y `buildGridMembers` |

