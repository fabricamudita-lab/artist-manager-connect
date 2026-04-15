

## Plan: Unificar acceso a Publishing/Master splits desde Créditos y Presupuestos

### Problema actual
- **Créditos y Autoría** (`ReleaseCreditos`): Muestra créditos por categoría (composición, producción, performance, etc.) pero **no** muestra los splits de Publishing ni Master
- **Presupuestos** (`ReleasePresupuestos`): Tiene 3 tabs: Presupuestos, Publishing, Master — aquí es donde viven los splits
- **Audio** (dialog de track): Tiene ambos (créditos + splits) en tabs dentro del dialog

Esto obliga al usuario a ir a Presupuestos para gestionar autoría/derechos, cuando la sección natural sería Créditos.

### Solución: Añadir tabs de Publishing y Master en Créditos

Añadir dos tabs adicionales en `ReleaseCreditos` que muestren los mismos componentes `TrackRightsSplitsManager` que ya usa Presupuestos. Los datos son los mismos (tabla `track_credits`), solo se monta el mismo componente desde dos lugares.

```text
ReleaseCreditos (actual):     [Créditos por track]
ReleaseCreditos (propuesto):  [Créditos] [Publishing] [Master]

ReleasePresupuestos:          [Presupuestos] [Publishing] [Master]  ← sin cambios
```

Así el usuario puede:
- Gestionar splits desde **Créditos** (contexto de autoría)
- Gestionar splits desde **Presupuestos** (contexto financiero)
- Los datos son los mismos, no hay duplicación

### Cambios

| Archivo | Cambio |
|---------|--------|
| `src/pages/release-sections/ReleaseCreditos.tsx` | Añadir `Tabs` con 3 tabs: "Créditos", "Publishing", "Master". El contenido actual va en "Créditos". Los otros dos renderizan `TrackRightsSplitsManager` por cada track, igual que en Presupuestos. Import del componente + hooks necesarios. |

Un solo archivo. El componente `TrackRightsSplitsManager` ya existe y es reutilizable.

