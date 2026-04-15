

## Plan: Mejoras en ambos PDFs basadas en estándares de la industria

### 1. Split Sheet — Columnas adicionales en Publishing

Tu documento modificado tiene dos columnas extra en la tabla de Autoría que son estándar para el registro en sociedades de gestión:

| Actual | Tu versión mejorada |
|--------|-------------------|
| Nombre, Roles, % Recaudable | Nombre, Rol, % Recaudable, **Sociedad (PRO)**, **Notas** |

- **Sociedad (PRO)**: Placeholder `[SGAE/BMI/ASCAP]` — el sistema no almacena esta info actualmente, pero el campo es esencial para que el documento sea útil al registrar obras
- **Notas**: Permite anotar casos especiales como "Dominio Público (DP)", "Cover Estándar", "Sujeto a revisión de obra derivada"
- La tabla de Master se mantiene igual (Nombre, Rol, %)

**Cambio en `exportSplitsPDF.ts`**: Ampliar `drawSplitTable` para renderizar 5 columnas en publishing y 3 en master.

### 2. Label Copy — Secciones categorizadas (plan pendiente)

Implementar la estructura que propusiste en tu mensaje anterior, con créditos organizados por sección:

```text
TRACK 01 — Amor constante más allá de la muerte
────────────────────
Artist: Leyre Estruch
ISRC: ...

COMPOSITION
  Composer: Alejandro Estruch
  Lyrics: Francisco de Quevedo

PRODUCTION
  Arrangements: Vicente López, Tramel Levalle, Biel Roca, Leyre Estruch
  Recording Engineer: Joan Nitu López
  Mixing Engineer: Adrià Serrano
  Mastering Engineer: Adrià Serrano

PERFORMANCE
  Lead Vocals: Leyre Estruch
  Guitar: Vicente López
  Percussion: Tramel Levalle
  Piano: Biel Roca Matamala

LYRICS
[...]
```

**Mapeo de secciones**:
- **COMPOSITION**: compositor, autor, letrista, co-autor, libretista, editorial
- **PRODUCTION**: productor*, arreglista, ingeniero_mezcla, masterizador, ingeniero_grabacion, ingeniero_sonido, estudio_grabacion, director_musical, programador
- **PERFORMANCE**: todos los roles de `interprete`
- **ADDITIONAL**: remixer, dj, director_video, director_arte, fotografo, disenador

Formato invertido: **"Rol: Nombre1, Nombre2"** (agrupar nombres por rol, no roles por persona). Etiquetas en inglés (estándar de distribuidoras).

**Cambio en `exportLabelCopyPDF.ts`**: Reemplazar `groupCreditsByPerson` por `groupCreditsBySection` con el mapeo anterior.

### 3. Consideración futura (sin cambio de DB ahora)

Los campos **Sociedad (PRO)** y **Notas** en el Split Sheet serán placeholders. Si en el futuro quieres que sean editables, necesitaríamos añadir columnas `pro_society` y `notes` a `track_credits`. Por ahora los placeholders cumplen la función del documento como plantilla de registro.

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/utils/exportSplitsPDF.ts` | Tabla publishing con 5 columnas, placeholders PRO y Notas |
| `src/utils/exportLabelCopyPDF.ts` | Secciones categorizadas COMPOSITION/PRODUCTION/PERFORMANCE/ADDITIONAL |

