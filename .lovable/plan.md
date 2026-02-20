
# Mejora de la selección de plantillas en Solicitudes

## Diagnóstico del problema

El `renderTemplateSelection()` en `CreateSolicitudFromTemplateDialog.tsx` (líneas 475-516) presenta las 6 plantillas de forma idéntica:
- Mismo fondo (`bg-gradient-primary`) para todos los iconos
- Mismo tamaño de card
- Descripción de una sola línea genérica
- El único diferenciador es el número de campos (lo cual no le dice nada al usuario sobre qué esperar)
- No hay ninguna jerarquía visual que refleje la importancia o frecuencia de cada tipo

## Propuesta: Rediseño completo de la pantalla de selección

### 1. Jerarquía visual por importancia

**Booking** es la solicitud más compleja e importante (genera booking_offers, tiene pipeline propio, afecta al calendario). Se diferenciará visualmente del resto.

Layout:
```text
┌─────────────────────────────────────────────────────────┐
│  🎤 BOOKING                                      [Hero] │
│  Conciertos, festivales y giras · El más frecuente      │
│  Genera automáticamente: Booking Offer + pipeline       │
│  ──────────────────────────────────────────────────     │
│                                                         │
│  🎙️ Entrevista        📜 Licencia Sync/Master           │
│  Medios y prensa      Uso de obra en terceros           │
│                                                         │
│  💬 Consulta          ℹ️ Información                    │
│  Decisión interna     Datos sobre proyecto              │
│                                                         │
│                    📄 Otro                              │
│            Solicitudes no categorizadas                 │
└─────────────────────────────────────────────────────────┘
```

### 2. Cards enriquecidas con contexto accionable

Cada card mostrará:
- **Icono con color propio** (no todos el mismo gradiente azul)
- **Título + badge de uso sugerido** (ej: "Más frecuente", "Necesita contrato", "Interna")
- **Descripción corta** orientada a acción ("Registra una oferta de actuación")
- **"Qué pasa después"**: una línea indicando el flujo que se activa al crear este tipo

Ejemplo para **Booking**:
```
🎤  Booking                          [Más frecuente]
    Registra una oferta de actuación en concierto,
    festival o evento privado.
    ──────────────────────────────────────────────
    ▶ Crea automáticamente un Booking Offer en el
      pipeline de negociación
```

Ejemplo para **Licencia**:
```
📜  Licencia                         [Contrato]
    Solicitud de uso de tu obra en medios, publicidad
    o proyectos de terceros.
    ──────────────────────────────────────────────
    ▶ Requiere aprobación + gestión de derechos
      (Master / Compositora)
```

### 3. Colores propios por tipo (en lugar de todos azul-gradiente)

| Tipo | Color del icono | Badge |
|---|---|---|
| Booking | Azul intenso `bg-blue-600` | "Más frecuente" |
| Entrevista | Verde `bg-green-600` | "Medios" |
| Licencia | Ámbar `bg-amber-600` | "Derechos" |
| Consulta | Violeta `bg-violet-600` | "Interna" |
| Información | Naranja `bg-orange-500` | "Datos" |
| Otro | Gris `bg-slate-500` | — |

### 4. Indicador "¿Qué pasa después?"

Esta es la mejora más importante desde el punto de vista de la industria. El usuario no sabe qué workflow se activa. Se añade en cada card una sección pequeña con el flujo:

- **Booking** → "Se crea un Booking Offer en estado Interés. Puedes aprobarlo para moverlo a Negociación."
- **Entrevista** → "Al aprobarla, puedes programar el encuentro y crear un evento en el calendario."
- **Licencia** → "Registra los derechos solicitados. Al aprobarla, genera un contrato de licencia."
- **Consulta / Información** → "Se gestiona internamente. Al resolverse, se archiva con comentario."
- **Otro** → "Solicitud libre. Tú decides el flujo."

## Cambios técnicos

### Archivo afectado: `src/components/CreateSolicitudFromTemplateDialog.tsx`

**Sólo se modifica la constante `templates` (líneas 27-117) y la función `renderTemplateSelection` (líneas 475-516).**

El resto del archivo (toda la lógica de formularios, `handleSubmit`, campos específicos por tipo) permanece intacto.

#### Cambio 1: Enriquecer la constante `templates`

Añadir dos nuevos campos por plantilla:
```ts
{
  id: 'booking',
  title: 'Booking',
  description: 'Registra una oferta de actuación en concierto, festival o evento privado.',
  nextStep: 'Crea un Booking Offer en el pipeline. Al aprobarse, pasa a Negociación.',
  badge: 'Más frecuente',
  badgeColor: 'bg-blue-100 text-blue-700',
  iconBg: 'bg-blue-600',
  icon: Calendar,
  color: 'bg-blue-100 text-blue-800',
  priority: 1,          // para ordenar Booking primero
  fields: [...]
}
```

#### Cambio 2: Reescribir `renderTemplateSelection`

Nuevo layout de 2 secciones:
1. **Booking como hero card** (ancho completo, más grande)
2. **Grid 2×2 para Entrevista, Licencia, Consulta, Información** + **Otro** centrado abajo

Estructura JSX propuesta:
```tsx
<div className="space-y-4">
  {/* Header */}
  <div className="text-center py-2">
    <h3 className="text-lg font-semibold mb-1">¿Qué tipo de solicitud es?</h3>
    <p className="text-sm text-muted-foreground">Elige el tipo para ver el formulario correcto y activar el flujo adecuado</p>
  </div>

  {/* Booking hero */}
  <Card className="cursor-pointer border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all"
        onClick={() => handleTemplateSelect('booking')}>
    <CardContent className="p-5">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Calendar className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-lg">Booking</h4>
            <Badge className="bg-blue-100 text-blue-700 text-xs">Más frecuente</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Registra una oferta de actuación: concierto, festival, evento privado o gira.
          </p>
          <div className="flex items-start gap-2 bg-blue-50 rounded-lg p-2.5 border border-blue-100">
            <span className="text-blue-500 text-xs mt-0.5">▶</span>
            <p className="text-xs text-blue-700">
              Crea automáticamente un <strong>Booking Offer</strong> en el pipeline. 
              Al aprobarse, pasa a Negociación y se puede vincular al calendario.
            </p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>

  {/* Grid 2×2 para el resto */}
  <div className="grid grid-cols-2 gap-3">
    {[entrevista, licencia, consulta, informacion].map(...)}
  </div>

  {/* Otro — secundario, al final */}
  <Card className="cursor-pointer opacity-70 hover:opacity-100 border-dashed ...">
    ...
  </Card>
</div>
```

#### Cambio 3: Cards secundarias con el "flujo siguiente"

Cada card del grid mostrará una línea de color `nextStep` al pie, mucho más compacta que la del Booking.

## Resultado visual final

```text
┌──────────────────────────────────────────────────────────┐
│  ¿Qué tipo de solicitud es?                              │
│  Elige el tipo para ver el formulario correcto...        │
│                                                          │
│  ┌────────────────────────────── (Hero: borde azul) ──┐  │
│  │  🎤  Booking                       [Más frecuente] │  │
│  │      Concierto, festival, evento privado o gira    │  │
│  │  ▶ Crea Booking Offer → pipeline Negociación       │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────────────────┐  │
│  │ 🎙️ Entrevista    │  │ 📜 Licencia                  │  │
│  │ Prensa y medios  │  │ Sync/Master · Derechos       │  │
│  │ ▶ Programa enc.  │  │ ▶ Gestión derechos           │  │
│  └──────────────────┘  └──────────────────────────────┘  │
│  ┌──────────────────┐  ┌──────────────────────────────┐  │
│  │ 💬 Consulta      │  │ ℹ️ Información               │  │
│  │ Decisión interna │  │ Datos sobre proyecto         │  │
│  │ ▶ Gestión interna│  │ ▶ Se archiva al resolver     │  │
│  └──────────────────┘  └──────────────────────────────┘  │
│                                                          │
│          - - - - - - - - - - - - - - - -                 │
│          📄 Otro (solicitud libre)                       │
│          - - - - - - - - - - - - - - - -                 │
└──────────────────────────────────────────────────────────┘
```

## Archivos afectados

| Archivo | Líneas | Tipo de cambio |
|---|---|---|
| `src/components/CreateSolicitudFromTemplateDialog.tsx` | 27-117 + 475-516 | Enriquecer `templates[]` + reescribir `renderTemplateSelection()` |

**Sin tocar**: lógica de formularios, `handleSubmit`, campos específicos, base de datos. Cambio puramente visual/UX de la pantalla de selección inicial.
