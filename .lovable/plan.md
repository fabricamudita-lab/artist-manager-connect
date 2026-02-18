
# Fix: Error al duplicar oferta — valor invalido para budget_status

## Problema

La funcion `duplicate_booking_deep` inserta `'borrador'` como valor de `budget_status` al duplicar presupuestos, pero el enum `budget_status` solo tiene dos valores validos: `nacional` e `internacional`. Esto causa el error `22P02: invalid input value for enum budget_status: "borrador"`.

## Solucion

Crear una nueva migracion SQL que actualice la funcion `duplicate_booking_deep`. En la seccion 2 (Duplicate budgets), cambiar la linea que hardcodea `'borrador'` por copiar el valor original del presupuesto fuente.

## Detalle tecnico

En la seccion de INSERT INTO budgets dentro de la funcion, cambiar:

```text
-- Actual (incorrecto):
p_user_id, 'borrador', country,

-- Corregido:
p_user_id, budget_status, country,
```

Esto copia el `budget_status` original del presupuesto fuente en lugar de forzar un valor que no existe en el enum.

Requiere una nueva migracion SQL con `CREATE OR REPLACE FUNCTION`.
