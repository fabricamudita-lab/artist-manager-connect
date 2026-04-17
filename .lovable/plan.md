

## Plan: Limitar a 3 toggles activos en configuración de tarjeta

### Cambio

En `src/components/ProjectSettingsDialog.tsx`, añadir lógica que:

1. Cuente cuántos toggles están activos (`Object.values(localConfig).filter(Boolean).length`).
2. Si ya hay 3 activos, deshabilitar los switches que están en `off` (para que no se puedan activar más).
3. Mostrar un texto indicativo tipo "Máximo 3 opciones" cuando se alcance el límite.
4. Siempre permitir desactivar un toggle activo para liberar espacio.

### Archivo afectado

| Archivo | Cambio |
|---|---|
| `src/components/ProjectSettingsDialog.tsx` | Añadir contador + `disabled` condicional en los `Switch` |

