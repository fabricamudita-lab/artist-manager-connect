

## Add Gantt Visual PDF Export with "Vista previa" option

### What the user wants
A PDF download option from the Gantt view that renders the cronograma as a **visual Gantt chart** (horizontal bars with timeline), not the current table-based PDF. Dates should appear on the right side of each task bar. Landscape, full-page layout.

### Approach

**New utility: `src/utils/exportCronogramaGanttPDF.ts`**

A new jsPDF-based function that draws the Gantt chart visually:

1. **Header**: Release title, artist name, export date
2. **Timeline header**: Month labels across the top, day grid lines
3. **Workflow sections**: Colored left border + workflow name + progress counter
4. **Task rows**: 
   - Task name on the left column (~120px)
   - Horizontal bar positioned by date range on the timeline
   - Bar colored by workflow (matching existing `WORKFLOW_COLORS`)
   - **Date label on the right side of each bar**: "13 mar – 18 mar" format
5. **Today line**: Vertical red dashed line at current date
6. **Page breaks**: Auto-paginate when rows exceed page height

Layout (landscape A4 = 297×210mm):
```text
┌─────────────────────────────────────────────────────────┐
│ Cronograma — Release Title              Exportado: fecha│
│                                                         │
│ Task Name       │ Ene 2026 │ Feb 2026 │ Mar 2026 │ ... │
│─────────────────┼──────────┼──────────┼──────────┼─────│
│ ♪ Flujo Audio 0/4                                      │
│   Grabación     │   ██████████        │13mar-18mar     │
│   Mezcla        │          ████████   │20mar-27mar     │
│ ♪ Flujo Visual  │                                      │
│   Sesión Fotos  │      ██            │                  │
└─────────────────────────────────────────────────────────┘
```

**Integration in `ReleaseCronograma.tsx`**

Replace or supplement the existing "Exportar PDF" button. When in Gantt view mode, the export will use the new visual Gantt PDF function. When in list mode, it keeps the existing table PDF.

### Files to modify/create

| File | Change |
|------|--------|
| `src/utils/exportCronogramaGanttPDF.ts` | New file — draws visual Gantt chart as PDF with bars + dates on right |
| `src/pages/release-sections/ReleaseCronograma.tsx` | Switch export to use Gantt PDF when `viewMode === 'gantt'`, keep table PDF for list view |

### Key details
- Uses raw jsPDF drawing (rect, text, line) — no html2canvas needed
- Calculates date range from min/max of all task dates, adds padding
- Each day maps to a pixel width based on available page width
- Workflow summary bars drawn as semi-transparent colored rectangles spanning the full workflow date range
- Task bars drawn as solid colored rectangles with rounded corners
- Date labels ("13 mar – 18 mar") drawn right-aligned after each bar
- Today marker as a vertical red line with "Hoy" label

