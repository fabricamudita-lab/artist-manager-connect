## Objetivo

Reubicar el botón "Formulario" del diálogo de Editar Contacto para que aparezca junto al nombre del contacto en la cabecera (lado derecho), replicando el patrón ya usado en `ArtistInfoDialog` (perfil del artista del roster).

## Estado actual

- `EditContactDialog.tsx` (línea 937-950): el botón "Formulario" vive en el `DialogFooter`, junto a "Cancelar" y "Guardar Cambios".
- `ArtistInfoDialog.tsx` (línea 446-478): muestra el botón "Formulario" como `Button variant="outline" size="sm"` alineado a la derecha del bloque de avatar+nombre, dentro de un `flex items-center justify-between`.

## Cambios

**Archivo único:** `src/components/EditContactDialog.tsx`

1. **Cabecera del formulario (línea 627-647):** convertir el contenedor en un `flex items-start justify-between gap-4`:
   - Mantener el bloque actual de avatar + nombre + rol + chips a la izquierda (envuelto en un `div className="flex items-start gap-4 flex-1 min-w-0"`).
   - Añadir a la derecha el botón "Formulario" (`variant="outline"`, `size="sm"`, icono `Share2`, con estado `generatingFormLink` y handler `handleGenerateFormLink` ya existentes).

2. **Footer (línea 937-957):** eliminar el `<Button>` de Formulario y la clase `sm:mr-auto`. El `DialogFooter` queda solo con "Cancelar" y "Guardar Cambios".

## Resultado visual

```text
┌─────────────────────────────────────────────────────────┐
│ [Avatar] Nombre Contacto              [⌁ Formulario]    │
│          Rol · categoría · email                        │
└─────────────────────────────────────────────────────────┘
[ Nombre * ] ...
...
                                  [ Cancelar ] [ Guardar ]
```

Sin cambios en lógica, handlers, ni en otros diálogos.
