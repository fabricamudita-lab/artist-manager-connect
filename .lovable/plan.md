
## Navegacion desde "Resumen por Categoria" a la categoria en "Elementos"

### Problema
Al hacer clic en una categoria en la tabla "Resumen por Categoria" (Vista General), no pasa nada. El usuario quiere que al pinchar se navegue automaticamente a la pestana "Elementos", se abra esa categoria y se haga scroll hasta ella.

### Cambios (solo en `src/components/BudgetDetailsDialog.tsx`)

**1. Convertir las pestanas principales a controladas**

Actualmente el `<Tabs>` principal usa `defaultValue="items"` (no controlado). Se necesita convertirlo a controlado con un estado:
- Anadir estado: `const [mainTab, setMainTab] = useState('items')`
- Cambiar `<Tabs defaultValue="items">` a `<Tabs value={mainTab} onValueChange={setMainTab}>`

**2. Crear funcion `navigateToCategory`**

Una funcion que:
1. Cambia la pestana activa a `"items"` (`setMainTab('items')`)
2. Abre la categoria objetivo (`setOpenCategories` anadiendo el ID)
3. Tras un breve `setTimeout` (para que el DOM se actualice), hace scroll al elemento de esa categoria

**3. Anadir `data-category-id` a cada seccion de categoria en "Elementos"**

En el `div` que envuelve cada categoria (linea ~3581), anadir un atributo `data-category-id={category.id}` para poder localizarlo con `querySelector`.

**4. Hacer clickable las filas de la tabla "Resumen por Categoria"**

En cada `<TableRow>` de la tabla de resumen (linea ~4518), anadir:
- `onClick={() => navigateToCategory(category.id)}`
- `className="cursor-pointer hover:bg-muted/50 transition-colors"`
- Solo para categorias con elementos (count > 0)

### Detalle tecnico

```text
Click en fila de categoria (Vista General)
  --> setMainTab('items')
  --> setOpenCategories(prev => new Set([...prev, categoryId]))
  --> setTimeout(() => {
        document.querySelector(`[data-category-id="${categoryId}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 150)
```

No se modifica ninguna otra seccion, columna ni logica existente.
