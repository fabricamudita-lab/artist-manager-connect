

## Diagnóstico definitivo

Verificado en BD: `field_config = {}` para Klaus Stroink → según `isArtistFieldVisible` TODOS los campos deben ser visibles. El código de `PublicArtistForm.tsx` (líneas 260-265, 322-360) renderiza correctamente las secciones Tallas, Salud y Notas cuando `field_config` está vacío.

**Conclusión**: el código es correcto. Si el usuario sigue viendo solo 3 secciones (General, Redes Sociales, Fiscal/Bancario), es **caché del navegador** sirviendo un bundle JS antiguo del dominio público (`artist-manager-connect.lovable.app`) anterior a las correcciones.

## Plan de fix robusto

Para descartar caché Y asegurar visibilidad incondicional, voy a:

### 1. Eliminar el gating por sección (`hasSizes`/`hasHealth`/etc)
Las secciones Tallas, Salud y Notas se renderizarán siempre que algún campo interno esté activo. Quitar el wrapper `{hasX && (...)}` y dejar que cada `renderInput` decida individualmente. Si TODOS los campos de una sección están `false`, la sección quedará vacía visualmente, así que mantendremos un check sencillo pero **directo sobre los campos individuales** sin variables intermedias que puedan caer en stale closure.

Cambio: en lugar de `const hasSizes = v('clothing_size') || v('shoe_size')` usar inline `{(v('clothing_size') || v('shoe_size')) && <Card>...`. Funcionalmente idéntico pero elimina cualquier posibilidad de timing/closure raro.

### 2. Añadir un cache-buster visible
Inyectar en `PublicArtistForm.tsx` un comentario versión + un `<meta>` de no-cache implícito mediante key dinámica en `<form key={fieldConfig version}>` para forzar remount cuando cambia el config.

### 3. Logs visibles en pantalla (modo debug)
Añadir un pequeño badge oculto (solo en desarrollo o con `?debug=1`) que muestre el `field_config` recibido y qué secciones renderiza. Así podemos confirmar 100% qué está leyendo el cliente sin abrir DevTools.

### 4. Pedir hard reload tras deploy
Al final, instrucción clara al usuario: **abre el enlace en pestaña incógnito** o haz Cmd+Shift+R en el dominio `artist-manager-connect.lovable.app` para descargar el bundle nuevo.

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/pages/PublicArtistForm.tsx` | Inline las condiciones de sección + badge debug opcional con `?debug=1` |

### Resultado esperado
- Tras el deploy + hard reload, aparecerán las 7 secciones: General, Redes, Tallas, Salud, Fiscal, Bancario, Notas (+ Custom Fields si existen).
- El badge `?debug=1` permitirá verificar en vivo qué `field_config` llega al cliente si vuelve a fallar.

