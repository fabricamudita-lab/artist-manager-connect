

# Rediseñar el dialogo de confirmacion al cambiar plantilla

## Problema actual

Los dos botones de accion ("Aplicar y mantener" y "Aplicar") son verdes, lo que genera confusion sobre cual elegir.

## Nuevo diseño

Cambiar el texto y la jerarquia visual de los botones. El dialogo preguntara si el usuario quiere mantener la informacion existente:

```text
+------------------------------------------+
| Campos con informacion se ocultaran      |
|------------------------------------------|
| Al aplicar esta plantilla se ocultaran   |
| estos campos que ya contienen            |
| informacion:                             |
|                                          |
|  - Nombre artistico                      |
|                                          |
| Los datos no se eliminan, solo dejan de  |
| ser visibles.                            |
|                                          |
| ¿Deseas mantener visibles los campos     |
| que ya contienen informacion?            |
|------------------------------------------|
| [Cancelar]  [Ocultar]  [Mantener] (verde)|
+------------------------------------------+
```

### Jerarquia de botones

- **Cancelar**: variant="outline" (como esta ahora)
- **Ocultar**: variant="secondary" o "outline" - aplica la plantilla tal cual, ocultando los campos con datos
- **Mantener**: variant="default" (verde, unico boton primario) - aplica la plantilla pero fuerza ON en campos con datos

Solo "Mantener" es verde, dejando claro que es la accion recomendada.

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/CreateContactDialog.tsx` | Cambiar textos y variantes de botones en el AlertDialog |
| `src/components/EditContactDialog.tsx` | Mismo cambio |

