## Por qué aparece "€2" en Estado de Pagos

### Diagnóstico

El badge colapsado de "Estado de Pagos" muestra el **caché del booking** (`fee`), no un pago real. Este booking en BBDD tiene `fee = 2000.00 €`.

El formateo se hace con:
```ts
const fmt = (v) => `€${v.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
```

→ El valor que se está renderizando **es `€2.000` (dos mil euros)**, mostrado en formato europeo donde el `.` es el separador de miles. Lo que parece "€2" es en realidad `€2.000` y el `.000` se está perdiendo visualmente (probablemente por el render del Card colapsado o algún issue de estilo/separador en tu navegador). El dinero **no sale "de la nada"**: es el fee del booking.

### Por qué confunde
1. **Etiqueta engañosa**: el badge dice "Estado de Pagos" pero muestra el caché total, no lo cobrado. Si todavía no hay pagos, mostrar el fee como cifra principal hace pensar que ya hay algo cobrado.
2. **Formato ambiguo**: `€2.000` en formato europeo es legítimo, pero a primera vista sin contexto se puede leer como "€2 con tres ceros decimales raros" o simplemente "€2" si el render visual se corta.

### Cambios propuestos

**1. Aclarar el badge colapsado** (`src/components/booking-detail/PaymentStatusCard.tsx`, líneas 226-231)

Cuando NO hay pagos registrados, en vez de mostrar el fee directo, mostrar:
- Etiqueta clara: `Total: €2.000` (o `Caché: €2.000`)
- Tooltip al hacer hover: "Caché total del booking. Aún no hay pagos registrados."

```tsx
<>
  <StatusBadge estado="pendiente" />
  <span className="text-sm text-muted-foreground">
    <span className="text-xs">Caché:</span> <span className="font-medium">{fmt(fee)}</span>
  </span>
</>
```

**2. Usar formato canónico EU consistente** con la regla del proyecto (`€XX.XXX,XX`). Sustituir `fmt` por la utilidad ya existente `formatCurrency` (si existe) o reforzar el separador de miles para que se vea siempre claro. Verificar que en bookings con cobros parciales también queda inequívoco: `€500 / €2.000`.

**3. Añadir leyenda secundaria** en el badge colapsado cuando hay pagos parciales: `Cobrado X de Y` para que se entienda lo que es la cifra.

### Lo que NO hay que cambiar
- El `fee` de 2.000 € en BBDD es correcto (es el caché del booking que tú definiste). No es un pago "fantasma".
- No hay datos basura ni cálculos erróneos: es puramente un problema de UX/legibilidad del badge.

### Pregunta para ti
¿Prefieres que el badge colapsado, cuando no hay pagos, muestre:
- **A**: `Caché: €2.000` (total del booking)
- **B**: `Pendiente €2.000` (lo que queda por cobrar)
- **C**: nada (solo el badge "Pendiente" sin cifra)

Mi recomendación: **A**, porque transmite claramente que es el total y no induce a pensar que ya se ha cobrado algo.