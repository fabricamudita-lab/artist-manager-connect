

## Ciclo de Mejora Profunda — MOODITA

Tras auditar las 47 páginas, 150+ componentes y 55 hooks del proyecto, he identificado los problemas organizados en 5 fases de ejecución.

---

### FASE 1 — Bugs silenciosos y datos incorrectos

**1.1 ArtistProfileDialog.tsx consulta `profiles` en vez de `artists`**
Hace `from('profiles').select('*').eq('id', artistId)` — pero `artistId` referencia la tabla `artists`, no `profiles`. Siempre devuelve vacío.
- Fix: Cambiar a `from('artists')`.

**1.2 Chat.tsx carga TODOS los perfiles sin filtro**
`from('profiles').select('*')` sin `.limit()` ni filtro. Con muchos usuarios, trae datos innecesarios y es lento.
- Fix: Filtrar por workspace o usar paginación.

**1.3 EPKs.tsx — 927 líneas sin modularizar**
Archivo monolítico con tabla, grid, dialogs y lógica de exportación.
- Fix: Extraer sub-componentes como en Fase 3 anterior.

**1.4 Agenda.tsx — 745 líneas sin modularizar**
Similar problema de mantenibilidad.

---

### FASE 2 — Limpieza de console.log y dead code

**2.1 Eliminar ~600+ console.log de producción**
Encontrados en 30+ archivos (hooks, pages, components). Exponen datos sensibles (user IDs, profile data, session info) y ensucian la consola.
- Fix: Eliminar todos excepto `console.error` legítimos. Reemplazar logs de debug con condicionales `if (import.meta.env.DEV)` solo donde sea realmente necesario.

**2.2 Eliminar archivos de mock de email**
`src/lib/emailMockData.ts` y `src/components/email/` (EmailSidebar, EmailList, EmailDetail) ya no se usan desde que Correo.tsx muestra un empty state.
- Fix: Borrar archivos muertos.

**2.3 Lanzamientos.tsx — 918 líneas**
La ruta `/lanzamientos` redirige a `/releases`. Si `Lanzamientos.tsx` ya no se usa en ninguna ruta activa, es dead code.
- Fix: Verificar y eliminar si corresponde.

---

### FASE 3 — Rendimiento y consultas

**3.1 OwnerDashboard — segunda ronda de queries secuencial**
Después del `Promise.all` principal (14 queries paralelas), hay 3 queries secuenciales más para attention items (oldSolicitudes, confirmedBookings, nearEvents). Estas podrían paralelizarse.
- Fix: Mover al `Promise.all` existente o crear un segundo `Promise.all`.

**3.2 Contacts.tsx (Mi Perfil) — no usa React Query**
Usa `useState` + `useEffect` manual para fetch de perfil. No hay cache, no hay stale-while-revalidate, no hay optimistic updates.
- Fix: Migrar a `useQuery` para consistencia con el resto de la app.

**3.3 Chat.tsx — no usa React Query**
616 líneas con gestión manual de estado. Cada acción hace fetch completo sin cache.
- Fix: Migrar las queries principales a React Query.

**3.4 Solicitudes.tsx — triple fetch en useEffect([]) sin dependencias**
`fetchSolicitudes(); fetchArtistsAndContacts(); updateExistingSolicitudesNames()` todo en un solo `useEffect`. `updateExistingSolicitudesNames` hace escrituras en la DB en cada carga de página.
- Fix: Separar el update a un proceso one-time o condicionado, no en cada render.

---

### FASE 4 — Refactorización de archivos grandes restantes

Archivos que superan 600 líneas y no fueron tocados en la Fase 3 anterior:

| Archivo | Líneas | Acción |
|---------|--------|--------|
| ProjectDetail.tsx | 3505 | Extraer tabs a componentes: Overview, Tasks, Files, Budget, Approvals |
| ReleaseCronograma.tsx | 2684 | Extraer secciones: TimelineView, MilestoneList, WorkflowBuilder |
| ReleaseCreditos.tsx | 1544 | Extraer: TrackList, CreditEditor, LabelCopyGenerator |
| Budgets.tsx | 1370 | Extraer: BudgetOverview, BudgetItemsTable, BudgetCharts |
| Carpetas.tsx | 1359 | Extraer: FolderTree, FileGrid, UploadArea |
| EPKs.tsx | 927 | Extraer: EPKTable, EPKGrid, EPKDialogs |
| Contacts.tsx | 911 | Extraer: ProfileForm, DocumentUpload, ProfileDisplay |
| BookingDetail.tsx | 869 | Ya modular parcialmente, extraer tabs restantes |

Priorizaré ProjectDetail (3505 líneas) y ReleaseCronograma (2684 líneas) por ser los más críticos.

---

### FASE 5 — Mejoras UX/UI

**5.1 QueryClient sin configuración de staleTime**
El `queryClient` se crea con defaults (staleTime: 0), lo que causa re-fetches innecesarios en cada navegación.
- Fix: Configurar `staleTime: 5 * 60 * 1000` (5 min) como default.

**5.2 Sidebar — "Correo" y "Chat" no funcionales**
Correo muestra "Próximamente" y Chat requiere auth real. Considerar agrupar o marcar visualmente.
- Fix: Añadir badge "Próximamente" al item de Correo en sidebar.

**5.3 Loading states inconsistentes**
Algunos usan `Skeleton`, otros `Loader2 animate-spin`, otros nada.
- Fix: Estandarizar usando Skeleton para layouts y Loader2 para acciones.

---

### Plan de ejecución (orden)

1. **Fase 1** — Fixes de bugs silenciosos (ArtistProfileDialog, Chat profiles query)
2. **Fase 2** — Limpieza de console.log (30+ archivos) + dead code (email mock, Lanzamientos)
3. **Fase 3** — Performance (QueryClient staleTime, Promise.all en OwnerDashboard, migrar a React Query)
4. **Fase 4** — Refactorización de los archivos más grandes (ProjectDetail, ReleaseCronograma, etc.)
5. **Fase 5** — Polish UX (sidebar badges, loading states consistentes)

Empezaré por la Fase 1 y continuaré secuencialmente. Al final entregaré un changelog completo.

