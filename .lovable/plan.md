## Diagnóstico

El componente `ProjectChecklistManager` se queda con "Cargando tareas..." indefinidamente cuando un proyecto **no tiene aún ningún checklist** creado.

### Causa raíz

En `src/components/ProjectChecklistManager.tsx`:

1. El estado inicial es `const [loading, setLoading] = useState(true)` (línea 94).
2. `setLoading(false)` solo se llama dentro de `fetchChecklistItems` (línea 394).
3. `fetchChecklistItems` solo se invoca cuando hay un `activeChecklistId`:
   ```ts
   useEffect(() => {
     if (activeChecklistId) {
       fetchChecklistItems();
     }
   }, [activeChecklistId]);
   ```
4. Si el proyecto no tiene checklists, `fetchChecklists` deja `activeChecklistId = null`, por lo que **`fetchChecklistItems` nunca se ejecuta** y `loading` se queda en `true` para siempre. El render se queda atascado en el bloque `if (loading)` (línea 1116) mostrando "Cargando tareas...". El bloque que muestra el botón "Crear primer checklist" (`checklists.length === 0 && !loading`, línea 1202) nunca se alcanza.

## Solución

Modificar el `useEffect` que reacciona a `activeChecklistId` (líneas 182-186) para que, cuando no haya checklist activo, **vacíe los items y desactive `loading`**:

```ts
useEffect(() => {
  if (activeChecklistId) {
    fetchChecklistItems();
  } else {
    setItems([]);
    setLoading(false);
  }
}, [activeChecklistId]);
```

Esto permite que el componente muestre correctamente el estado vacío con el botón para crear el primer checklist desde plantilla o en blanco.

### Fuera de alcance

- No se toca la lógica de fetching ni la BD.
- No se cambian otros componentes.
