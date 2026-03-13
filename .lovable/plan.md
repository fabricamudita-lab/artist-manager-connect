

## Improve Gantt Timeline Header — Match PDF Export Style

### Problem
The month headers in the interactive Gantt chart are nearly invisible: plain text in a subtle `bg-muted/30` bar with no cell borders or backgrounds. Labels disappear when months are narrow. The PDF export looks much better with distinct month cells, borders, and clear typography.

### Changes

**File: `src/components/lanzamientos/GanttChart.tsx`**

1. **Redesign the timeline header** (lines ~658-675):
   - Replace the single `bg-muted/30` bar with individual month cells that have:
     - Distinct alternating backgrounds (`bg-muted/20` and `bg-muted/40`) for visual separation
     - Vertical border separators between months (`border-r border-border`)
     - Capitalized month labels (already capitalized via CSS class, but ensure it works)
     - Smaller threshold for showing labels: show abbreviated month (`MMM`) when narrow, full name when wide
   - Make the header slightly taller for better readability (keep current `h-10` for normal, `h-7` for fitToView)
   - Add a bottom border line to clearly separate header from content

2. **Add vertical month grid lines** in the task area (lines ~678 area):
   - Add faint vertical lines at each month boundary extending through all workflow rows
   - Use `border-l border-border/20` or similar subtle styling
   - This mirrors the PDF export's grid lines

3. **Improve "today" marker**:
   - Add a small "Hoy" label above the red line (like the PDF does)
   - Use `text-[10px] text-red-500 font-semibold`

### Visual Result
- Clear month columns with alternating backgrounds and separators
- Vertical grid lines through the Gantt body for easy date reading
- "Hoy" label on the today marker
- Matches the polished look of the PDF export

