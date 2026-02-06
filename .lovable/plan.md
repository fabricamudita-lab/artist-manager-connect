
# Plan: Corregir logica de visibilidad de campos en ContactProfileSheet

## Problema Identificado

El panel lateral `ContactProfileSheet` muestra todos los campos aunque en "Configuracion de Campos" estan desactivados. Esto ocurre porque:

1. El `field_config` del contacto solo almacena las claves que se han activado explicitamente
2. La logica actual trata `undefined` como "visible" cuando deberia tratarlo como "oculto"

Por ejemplo, el contacto "Horacio Mateo Fumero" tiene este `field_config`:
```text
{
  is_management_team: false,
  is_team_member: true,
  team_categories: ["banda"]
}
```

No contiene `email`, `phone`, `stage_name`, etc., por lo que la funcion `isFieldVisible` retorna `true` incorrectamente.

## Solucion

Modificar la funcion `isFieldVisible` en `ContactProfileSheet.tsx` para que solo retorne `true` cuando el campo esta **explicitamente activado** (`=== true`):

### Codigo Actual (incorrecto)
```typescript
const isFieldVisible = (fieldKey: string): boolean => {
  if (!contact?.field_config) return true;
  if (contact.field_config[fieldKey] === undefined) return true;
  return contact.field_config[fieldKey] === true;
};
```

### Codigo Corregido
```typescript
const isFieldVisible = (fieldKey: string): boolean => {
  // Si no hay field_config, no mostrar campos configurables
  if (!contact?.field_config) return false;
  // Solo mostrar si esta explicitamente activado
  return contact.field_config[fieldKey] === true;
};
```

## Cambios Tecnicos

### Archivo: `src/components/ContactProfileSheet.tsx`

**Lineas 207-211** - Actualizar la funcion `isFieldVisible`:

```typescript
const isFieldVisible = (fieldKey: string): boolean => {
  if (!contact?.field_config) return false;
  return contact.field_config[fieldKey] === true;
};
```

## Comportamiento Esperado

| Valor en field_config | Antes | Despues |
|----------------------|-------|---------|
| `true` | Visible | Visible |
| `false` | Oculto | Oculto |
| `undefined` (no existe) | Visible | Oculto |
| `field_config` es `null` | Visible | Oculto |

## Impacto

- Los campos solo apareceran en el panel lateral si el usuario los ha activado explicitamente en "Configuracion de Campos"
- Esto mantiene coherencia visual entre el estado de los toggles y lo que se muestra
- Los campos como ciudad y pais (que no estan controlados por `field_config`) seguiran mostrando siempre

## Notas Adicionales

- El campo "nombre" principal siempre se muestra (no usa `isFieldVisible`)
- Las secciones de equipo, roles en proyectos y registro no se ven afectadas
- Los campos ciudad/pais no usan `isFieldVisible`, por lo que siempre apareceran
