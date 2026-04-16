

## Diagnóstico

El usuario tiene razón: cuando un campo predefinido (ej: Stage name, IBAN) se desactiva con el toggle de "Configuración de campos", desaparece del editor del manager (`ArtistInfoDialog`). Pero los **campos personalizados** desactivados siguen apareciendo en el editor — solo se ocultan en el formulario público.

## Cambio

| Archivo | Cambio |
|---|---|
| `ArtistInfoDialog.tsx` | En la sección "Campos personalizados" del editor (la que muestra los inputs `test`, etc.), filtrar los campos por `isArtistFieldVisible(fieldConfig, 'custom_${field.id}')`. Si está desactivado → no se renderiza el input. |

## Resultado
- Toggle ON → el campo personalizado aparece tanto en el editor del manager como en el formulario público.
- Toggle OFF → desaparece de ambos sitios (consistente con los campos predefinidos).
- El catálogo de campos en "Configuración de campos" sigue mostrando todos los toggles para poder reactivarlos.

