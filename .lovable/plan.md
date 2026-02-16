
# Fix: Action Center crash por tipo de solicitud no reconocido

## Problema

Hay una solicitud en la base de datos con `tipo = 'licencia'`, pero el codigo solo define configuracion para 5 tipos: `entrevista`, `booking`, `consulta`, `informacion`, `otro`. Cuando el codigo intenta acceder a `typeConfig['licencia'].label`, obtiene `undefined` y crashea con:

```
TypeError: Cannot read properties of undefined (reading 'label')
```

## Solucion

Agregar `licencia` al `typeConfig` y hacer que todos los accesos a `typeConfig` sean seguros con un fallback por defecto, para que si en el futuro aparece otro tipo no registrado, no vuelva a romper la pagina.

## Cambios tecnicos

### 1. `src/pages/Solicitudes.tsx`

- Agregar `licencia` al objeto `typeConfig`:
  ```
  licencia: { label: 'Licencia', icon: FileText, color: 'bg-teal-500' }
  ```
- Agregar al interface `Solicitud` el tipo `'licencia'` a la union de `tipo`
- Agregar un fallback seguro: crear una constante `defaultTypeConfig` y usar una funcion helper `getTypeConfig(tipo)` que devuelva la config o el fallback si el tipo no existe

### 2. `src/components/SolicitudesKanban.tsx`

- Agregar `licencia` al `typeConfig` local (o importar el compartido)
- Proteger los accesos con el mismo patron de fallback

### 3. `src/components/SolicitudesStats.tsx`

- Agregar `licencia` al `typeConfig` local
- Ya usa `Object.keys(typeConfig)` asi que se beneficia automaticamente

### 4. `src/components/CreateSolicitudDialog.tsx` (si aplica)

- Agregar la opcion `licencia` al selector de tipo para que se pueda crear desde la UI

Con estos cambios, el Action Center dejara de crashear y mostrara correctamente las solicitudes de tipo "Licencia".
