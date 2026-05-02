## "Tipo de Oferta" como desplegable con opciones estándar

Convertir el input libre de **Tipo de Oferta** en un combobox que ofrece las opciones estándar de la industria, pero permite escribir cualquier valor personalizado. Así se gana consistencia sin perder flexibilidad para los casos no estándar (que ahora mismo se usan, ej. importes con IVA).

### Opciones predefinidas
- **Flat Fee** — Caché fijo
- **Door Deal** — % de taquilla
- **Flat Fee + Door Deal** — Mínimo garantizado + % sobre umbral
- **Vs. Door Deal** — El mayor entre flat fee y door deal
- **Bell Curve / Plus Walkout** — Escalonado por taquilla
- **Guarantee + Bonus** — Mínimo + bonus por objetivos
- **Profit Split** — Reparto de beneficios tras gastos

### Comportamiento UX
- Combobox tipo "search + select" (mismo patrón que ya se usa para Géneros / Roles).
- Si el usuario escribe algo que no está en la lista, aparece "Usar **'mi texto'**" como opción → permite valores libres.
- Al abrir, si ya hay un valor que coincide con una opción estándar, queda marcado como seleccionado.
- Placeholder: "Selecciona o escribe…".

### Cambios técnicos
**1. Nuevo catálogo `src/lib/booking/offerTypes.ts`**
```ts
export const OFFER_TYPES = [
  { value: 'Flat Fee', description: 'Caché fijo' },
  { value: 'Door Deal', description: '% de taquilla' },
  // ...
] as const;
```

**2. Nuevo componente `OfferTypeCombobox`** (`src/components/booking-detail/OfferTypeCombobox.tsx`)
- Usa los primitivos `Popover` + `Command` ya disponibles en el proyecto (mismo patrón que otros combobox).
- Props: `value: string | null`, `onChange: (v: string | null) => void`.

**3. Sustituir el `<Input>` actual** en `src/components/booking-detail/EditBookingDialog.tsx` (línea ~755-760) por `<OfferTypeCombobox />`.

### Lo que NO se va a tocar (justificación)
El usuario incluyó varias instrucciones genéricas que en este caso concreto no aplican o serían contraproducentes; las explico para que quede claro:

- **Esquema BBDD / migración / índices**: el campo `bookings.oferta` ya existe como `text` y se sigue guardando string. No se cambia el schema, no hace falta migración ni índices nuevos (no es columna que se filtre por búsqueda).
- **Validación Zod en backend**: el guardado pasa por la mutación existente del booking que ya está protegida por RLS. No hay endpoint nuevo. Añadir Zod aquí sería duplicar lo que ya hace Supabase con su tipado.
- **Prevención SQL injection / XSS**: el valor se pasa al cliente Supabase como parámetro (no concatenado en SQL) y se renderiza con React (auto-escapado). No hay `dangerouslySetInnerHTML` en este flujo.
- **Paginación**: las opciones son ~7-10 valores hardcoded en frontend, no hay query.
- **Compatibilidad con auth / panel de usuario**: el cambio es puramente de UI dentro de un dialog; no toca permisos ni navegación.

Si en el futuro el catálogo de "Tipo de Oferta" debe ser editable por workspace (con tabla, RLS y CRUD), eso sí justificaría migración + Zod + paginación, y lo abordaríamos como tarea aparte.