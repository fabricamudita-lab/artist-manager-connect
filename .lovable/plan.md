
# Genero musical multi-seleccion con comas

Convertir el `GenreCombobox` de seleccion unica a seleccion multiple, donde los generos se acumulan separados por comas. El valor sigue siendo un string (ej. `"Jazz, Techno, Ambient"`) para compatibilidad con la base de datos.

---

## Comportamiento

1. El boton muestra los generos seleccionados: `Jazz, Techno, Ambient`
2. Al abrir el popover, el input de busqueda esta vacio y listo para escribir
3. Al seleccionar un genero de la lista, se anade al valor con coma: `Jazz, Techno`
4. Si el genero ya esta seleccionado, al hacer clic se elimina
5. Los generos ya seleccionados aparecen con check marcado en la lista
6. La busqueda filtra solo por lo que se escribe despues de la ultima coma
7. El popover NO se cierra al seleccionar -- permanece abierto para seguir anadiendo
8. Se puede borrar generos haciendo clic en ellos (toggle)

---

## Cambios en `src/components/GenreCombobox.tsx`

### Logica interna

- Parsear `value` en un array: `value.split(',').map(s => s.trim()).filter(Boolean)`
- Al seleccionar un genero:
  - Si ya esta en el array, eliminarlo (toggle)
  - Si no esta, anadirlo
  - Llamar `onValueChange` con el array unido por `", "`
- NO cerrar el popover al seleccionar (quitar `setOpen(false)` del onClick)
- Limpiar solo el search al seleccionar, no al cerrar

### Busqueda

- El input de busqueda es independiente -- solo filtra la lista de sugerencias
- Al seleccionar, se limpia el search para empezar a buscar el siguiente genero

### Boton trigger

- Mostrar los generos seleccionados separados por coma, o "Seleccionar generos..." si vacio
- Truncar con CSS si la lista es muy larga

### Check marks

- Comparar cada genero de la lista contra el array de seleccionados (no contra el string completo)

---

## Archivo afectado

| Archivo | Cambio |
|---|---|
| `src/components/GenreCombobox.tsx` | Convertir a multi-seleccion con toggle, popover persistente, checks por array |

No se modifica `ArtistInfoDialog.tsx` -- la interfaz `value: string` y `onValueChange: (v: string) => void` se mantiene igual. El valor simplemente pasa de `"Jazz"` a `"Jazz, Techno"`.
