

## Hacer clic en el nombre del presupuesto para ir al evento de booking

### Contexto
El nombre del presupuesto (ej. "Presupuesto - CurtCircuit") se muestra en el header del diálogo pero no es clicable. El usuario quiere que al hacer clic navegue al evento de booking vinculado.

### Enfoque
El componente ya resuelve el `bookingContext` (con `bookingId`) a través de la carpeta de storage. Además, la tabla `budgets` tiene un campo `booking_offer_id` directo que es más fiable. Usaremos ambas fuentes:

1. **Añadir `booking_offer_id` a la interfaz `Budget`** (línea ~93) como campo opcional.
2. **Determinar el booking ID** usando `budget.booking_offer_id` (directo) o `bookingContext?.bookingId` (fallback por storage).
3. **Hacer el nombre clicable** (línea ~3024): Si hay un booking vinculado, envolver `budgetData.name` en un enlace con `onClick={() => navigate(/booking/${bookingId})` con estilo hover y un icono `ExternalLink`.

### Cambios en `src/components/BudgetDetailsDialog.tsx`

- Línea ~93: Añadir `booking_offer_id?: string` a la interfaz `Budget`.
- Línea ~3024: Convertir el `DialogTitle` con el nombre en un elemento clicable condicionalmente, solo cuando exista `booking_offer_id` o `bookingContext?.bookingId`.
- Importar `useNavigate` de react-router-dom.

### Resultado
Al hacer clic en "Presupuesto - CurtCircuit", el usuario navegará a `/booking/{id}` del evento vinculado. Si no hay booking vinculado, el nombre se muestra como texto normal sin interacción.

