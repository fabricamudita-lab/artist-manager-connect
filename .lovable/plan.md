

## Fix: Cover Álbum no debe cambiar al guardar otros cambios

### Problema
Cuando se edita cualquier campo de un asset de tipo "Cover Álbum" o "Cover Single" y se guarda, la lógica de sincronización automática actualiza el `cover_image_url` del release indiscriminadamente. Esto causa que el cover del álbum se sobreescriba incluso cuando no se ha cambiado el tipo de asset.

### Solución

**Archivo: `src/components/dam/AssetDetailPanel.tsx`**

Modificar la lógica de sincronización (líneas 128-140) para que:

1. **Cover Álbum** solo actualice `cover_image_url` del release cuando el `sub_type` **acaba de cambiar** a "Cover Álbum" (no lo tenía antes) O cuando el status cambia a "listo"/"publicado" por primera vez. Es decir, comparar `asset.sub_type` (valor anterior) con `form.sub_type` (valor nuevo).

2. **Cover Single** solo actualice si el asset está vinculado a un track (`track_id`), y en ese caso no toque el cover del release.

Lógica concreta:
```text
Si form.sub_type === 'Cover Álbum' 
  Y status es 'listo' o 'publicado'
  Y (el sub_type cambió O el status cambió a listo/publicado)
  → actualizar release.cover_image_url

Si form.sub_type === 'Cover Single'
  → NO tocar release.cover_image_url (es cover de single, no de álbum)
```

Esto evita que al editar otros campos (descripción, tags, resolución, etc.) de un asset ya marcado como "Cover Álbum" se re-dispare la sincronización innecesariamente, y garantiza que un "Cover Single" nunca sobreescriba la portada del álbum.

