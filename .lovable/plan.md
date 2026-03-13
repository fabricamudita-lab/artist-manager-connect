

## Fix Industry-Incorrect Timeline Template Offsets

### Problems Identified
1. **Fabrication sequence is broken**: Vinyl manufacturing takes 10-16 weeks, but current offsets pack everything into 3 weeks (-35 to -14). Physically impossible.
2. **Pitch editorial too late**: Current -28 days gives only 4 weeks; industry standard requires 6-8 weeks.
3. **Videoclip delivered too late**: At -14 days there's no margin to use it for pitch or pre-save campaigns.

### Corrected Offsets

**File: `src/lib/releaseTimelineTemplates.ts`**

Update the `TIMELINE_TEMPLATES` array with corrected `offsetDays` and `estimatedDays`:

| Task | Current offset | New offset | New est. days | Rationale |
|------|---------------|------------|---------------|-----------|
| **Fabricación** | | | | |
| Envío a Fábrica | -35, 2d | **-140**, 2d | 2 | ~20 weeks before release; needs master+artwork |
| Test Pressing | -33, 14d | **-100**, 14d | 14 | ~14 weeks; 6-week turnaround after send |
| Recepción Stock | -14, 7d | **-21**, 10d | 10 | ~3 weeks before; 8-week mass production after approval |
| **Contenido — Videoclip** | | | | |
| Pre-producción Videoclip | -60, 7d | **-118**, 11d | 11 | After artwork is defined |
| Rodaje Videoclip | -45, 3d | **-108**, 3d | 3 | Right after pre-production |
| Edición Videoclip | -30, 14d | **-84**, 24d | 24 | 3-4 weeks realistic post-production |
| Videoclip Entregado | -14, 2d | **-50**, 2d | 2 | Ready before distributor delivery & pitch |
| **Contenido — Promo** | | | | |
| Making Of | -21, 7d | **-65**, 7d | 7 | Earlier to feed pre-campaign |
| Clips para Redes | -14, 5d | **-57**, 7d | 7 | Cut after final video delivered |
| Visualizers | -7, 5d | **-47**, 13d | 13 | Published in pre-launch window |
| **Marketing** | | | | |
| Entrega a Distribuidora | -28, 1d | **-57**, 2d | 2 | 8 weeks before for DSP ingestion |
| Focus Track / Pitch | -28, 1d | **-55**, 2d | 2 | 1-2 days after delivery appears on platform |
| Pre-save Activo | -28, 1d | **-50**, 2d | 2 | Once release is in pre-save mode on stores |

No changes to: Audio workflow, Visual workflow, Singles, Salida Digital (0), Venta Física (+7).

### Single file change
Only `src/lib/releaseTimelineTemplates.ts` — update ~15 lines of offset/estimatedDays values in the `TIMELINE_TEMPLATES` constant.

### Impact
- Existing cronogramas already saved in the DB are **not affected** (milestones are stored with actual dates)
- Only new cronograma generation (wizard) will use the corrected offsets
- The PDF export logic is unchanged (it reads from stored milestones)

