## Plan: añadir participante con redistribución proporcional automática

### Comportamiento actual
Al añadir un participante a Royalties Master o Publishing, el porcentaje se inserta tal cual y el total puede pasar de 100%. El usuario tiene que ajustar manualmente al resto.

### Nuevo comportamiento
Al añadir un nuevo participante, el porcentaje que indique se "reserva" y al resto de participantes existentes se les resta proporcionalmente para que el total siga siendo 100%.

Ejemplo:
```text
Antes: P1=50%, P2=50%   (total 100%)
Añado P3 con 50%
Después: P1=25%, P2=25%, P3=50%
```

Si el reparto exacto entre los existentes no es entero/medio (paso 0,5%) y queda un sobrante de redondeo, el sistema preguntará a quién dar ese resto (redondeo al alza).

Ejemplo con resto:
```text
Antes: P1=33%, P2=33%, P3=34%   (total 100%)
Añado P4 con 50%
Hay que repartir 50% entre 3 → 16,67% c/u
Sistema: pregunta "¿A quién asignar el 0,5% restante?" con lista P1/P2/P3
Resultado final: por ejemplo P1=17%, P2=16,5%, P3=16,5%, P4=50%
```

### Flujo de UI
1. En el formulario "Añadir participante" (tanto modo Agenda como Nuevo Perfil) aparece una nueva opción / botón:
   - **Añadir y ajustar resto** (nueva acción principal de proporcionalidad)
   - **Añadir tal cual** (comportamiento actual, por si el usuario quiere meter el % sin tocar a los demás)
2. Si al pulsar "Añadir y ajustar resto" hay sobrante por redondeo, se abre un mini-diálogo:
   - Lista de participantes existentes con checkboxes (selección múltiple permitida).
   - Texto: "¿A quién asignar el X% restante?"
   - Botón Confirmar.
3. El sistema guarda en una sola operación: actualiza los % de los existentes y crea el nuevo.

### Reglas de redistribución
- Solo afecta a los participantes del mismo tipo (publishing o master) del mismo track.
- El nuevo % no puede ser >100. Si es 100, todos los demás quedan en 0 (con confirmación).
- Si actualmente el total NO es 100% (estado incompleto), la lógica reparte sobre el espacio realmente ocupado y mantiene la proporción relativa entre los existentes.
- Paso de cálculo: 0,5% (igual que el slider actual). Sumas se cuadran al 100% exacto usando el/los participantes elegidos para el redondeo.
- Si solo hay 1 participante existente, no hace falta preguntar: recibe todo el sobrante.
- Si no hay participantes existentes, se inserta el nuevo tal cual (no hay nada que repartir).

### Cambios técnicos
| Archivo | Cambio |
|---|---|
| `src/components/releases/TrackRightsSplitsManager.tsx` | 1) Añadir helper `redistributeSplits(existing, newPct, step=0.5)` que devuelve `{ updates, remainder }`. 2) En `AddSplitForm` añadir el botón "Añadir y ajustar resto" junto a "Añadir". 3) Pasar callback nuevo `onSaveWithRedistribute` desde el manager. 4) En el manager, implementar `handleCreateWithRedistribute(data)` que: calcula la redistribución, si hay `remainder>0` y existen ≥2 participantes abre `RoundingPickerDialog`, aplica updates en lote (`upsert` por id) + insert del nuevo, invalida caché. |
| Mismo archivo | Nuevo subcomponente `RoundingPickerDialog` (basado en `Dialog` de shadcn) con lista de participantes y checkboxes para elegir destinatarios del sobrante. |

### Resultado esperado
- Al añadir un nuevo participante con % > 0, el usuario puede elegir entre añadirlo "tal cual" (legacy) o "ajustando el resto" (nuevo, recomendado).
- Con la opción de ajuste, el total siempre queda en 100%.
- Cuando el reparto no es exacto, la app pregunta a quién dar el sobrante en lugar de decidirlo en silencio.
- No hay cambios en la base de datos ni en RLS; solo se reutilizan las operaciones existentes de `track_credits`.