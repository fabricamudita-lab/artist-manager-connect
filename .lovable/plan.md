

## Automatizaciones por artista + canal WhatsApp

### Objetivo
Permitir que cada automatizacion se configure de forma distinta segun el artista: aplicar a todos, o solo a artistas seleccionados. Ademas, anadir WhatsApp como canal de notificacion.

### Cambios

#### 1. Migracion de base de datos

Modificar la tabla `automation_configs`:

- Anadir columna `artist_ids uuid[] DEFAULT '{}'` (array de IDs de artistas). Vacio = aplica a todos.
- Actualizar el constraint UNIQUE de `(workspace_id, automation_key)` -- se mantiene igual, ya que la configuracion sigue siendo una por automatizacion por workspace, pero ahora incluye a que artistas aplica.

No se necesita cambiar el constraint porque el modelo es: **una fila por automatizacion por workspace**, y dentro de esa fila el campo `artist_ids` indica el alcance.

#### 2. Actualizar definiciones de canales

Archivo: `src/lib/automationDefinitions.ts`

- Cambiar `CHANNEL_OPTIONS` para incluir WhatsApp:
  - `in_app` -> In-app
  - `email` -> Email  
  - `whatsapp` -> WhatsApp

- Eliminar la opcion "Ambos" (redundante si se puede elegir multiples canales en el futuro, pero por ahora mantener opciones simples: in_app, email, whatsapp).

#### 3. Actualizar el hook `useAutomationConfigs`

Archivo: `src/hooks/useAutomationConfigs.ts`

- Anadir `artist_ids` al tipo `AutomationConfig`
- Incluir `artist_ids` en el merge de configs (default: array vacio = todos)
- Pasar `artist_ids` en el upsert
- Cargar la lista de artistas del workspace para el selector

#### 4. Actualizar la UI de la tarjeta de automatizacion

Archivo: `src/pages/Automatizaciones.tsx`

- En la seccion de "Configuracion avanzada", anadir un nuevo campo **"Aplica a"** con dos modos:
  - **Todos los artistas** (por defecto): no se selecciona ningun artista especifico
  - **Artistas seleccionados**: aparece un multi-select con los artistas del workspace
- Mostrar un indicador visual en la tarjeta cuando la automatizacion esta limitada a artistas especificos (ej: chips con nombres de artistas)
- Actualizar el selector de canal para mostrar las 3 opciones: In-app, Email, WhatsApp

#### 5. Resumen visual del flujo

```text
Tarjeta de automatizacion
+--------------------------------------------------+
| Oferta sin respuesta                    [ON/OFF]  |
| Descripcion...                                    |
|                                                   |
| [3 dias] [Equipo Booking] [In-app] [Todos]        |
|                                                   |
| [v Configuracion avanzada]                        |
|   Dias de espera: [====3====]                     |
|   Notificar a: [Equipo Booking v]                 |
|   Canal: [In-app v]  (opciones: In-app/Email/WA)  |
|   Aplica a: ( ) Todos  (x) Seleccionar artistas  |
|             [Artista 1] [Artista 2] [+]           |
+--------------------------------------------------+
```

### Archivos a modificar
1. **Migracion SQL** -- anadir columna `artist_ids` a `automation_configs`
2. `src/lib/automationDefinitions.ts` -- actualizar `CHANNEL_OPTIONS`
3. `src/hooks/useAutomationConfigs.ts` -- incluir `artist_ids` y carga de artistas
4. `src/pages/Automatizaciones.tsx` -- UI del selector de artistas y canal WhatsApp

