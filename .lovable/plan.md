

## Editar Estado de Pagos en Booking

### Problema
Una vez registrado un cobro (pago unico o fraccionado), no se puede corregir si fue un error. La tarjeta "Estado de Pagos" es de solo lectura.

### Solución
Añadir un botón "Editar" en la tarjeta de Estado de Pagos que reabra el PagoDialog en modo edición, permitiendo modificar importe, fecha, referencia, o revertir el estado a "pendiente".

### Peligros y protecciones

1. **Cobros reflejados en Finanzas (CobrosTab)**: Si se modifica un cobro, la pestaña Cobros de Finanzas se actualiza automáticamente porque lee directamente de `booking_offers`. Sin riesgo de desincronización.

2. **Retenciones IRPF ya contabilizadas (Modelo 111)**: Si el cobro pertenece a un trimestre fiscal ya presentado/bloqueado, el cambio podría alterar las cifras fiscales. Se mostrará un aviso antes de permitir la edición.

3. **Liquidaciones dependientes del anticipo**: Si se revierte un anticipo a "pendiente", la liquidación debe volver a estado bloqueado. Se gestionará automáticamente.

4. **Cobros vinculados a tabla `cobros`**: El PagoDialog ya escribe en `cobros` al registrar. Al editar, se actualizarán esos registros correspondientes.

### Cambios

**`PaymentStatusCard.tsx`**
- Añadir botón `Pencil` (editar) junto al título o en cada sección de pago cobrado.
- Al pulsar, abrir PagoDialog con los datos actuales precargados.
- Añadir botón "Revertir a pendiente" con `AlertDialog` de confirmación que explique las consecuencias (afecta Finanzas, posible impacto fiscal).

**`PagoDialog.tsx`**
- Aceptar nueva prop `editMode?: boolean` para precargar campos con datos existentes del booking en vez de defaults.
- En modo edición, permitir guardar cambios sobre los mismos campos (update en lugar de crear nuevo registro).
- Antes de guardar, verificar si hay retenciones IRPF en trimestres bloqueados vinculadas a este booking; si las hay, mostrar aviso.

**Flujo visual**
```text
[Estado de Pagos]
  Pago único         ✓ Cobrado    [✏️ Editar]
  €2500              10/04/2026

  Click ✏️ → PagoDialog (modo edición, campos prellenados)
  
  [Revertir a pendiente] → AlertDialog:
    "⚠️ Esto marcará el cobro como no recibido.
     - Se actualizará el estado en Finanzas.
     - Si hay retenciones IRPF registradas en un trimestre
       presentado, podrían verse afectadas."
    [Cancelar] [Confirmar]
```

### Resultado
- Se pueden corregir errores de importe, fecha, referencia o revertir cobros.
- El usuario siempre ve avisos claros sobre las consecuencias antes de confirmar cambios destructivos.
- Los datos en Finanzas se mantienen sincronizados automáticamente.

