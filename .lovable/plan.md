
## Release Task Center -- Avisos inteligentes en la vista de Lanzamiento

### Que se va a hacer

Se creara un panel de avisos en la parte inferior de la pagina de detalle de cada lanzamiento (`ReleaseDetail.tsx`). Este panel analiza automaticamente el estado de todas las secciones del lanzamiento y muestra tarjetas de aviso con acciones rapidas.

### Avisos implementados

| Seccion | Condicion | Icono | Severidad | Ejemplo de mensaje |
|---------|-----------|-------|-----------|-------------------|
| Creditos | Tracks sin creditos registrados | Users | warning (ambar) | "Faltan 5 de 6 canciones por inscribir en Creditos y Autoria" |
| Audio | Tracks sin archivos de audio subidos | Music | warning (ambar) | "3 canciones sin archivo de audio" |
| Cronograma | No hay milestones creados | Calendar | info (azul) | "El Cronograma aun no ha sido creado" |
| Cronograma | Milestones con fecha proxima (7 dias) | Calendar | urgent (rojo) | "2 tareas del cronograma vencen en los proximos 7 dias" |
| Cronograma | Milestones retrasados | Calendar | urgent (rojo) | "3 tareas del cronograma estan retrasadas" |
| Presupuestos | Gastos reales superan estimados | DollarSign | warning (ambar) | "El presupuesto esta sobregirado en $2,500" |
| Presupuestos | No hay presupuesto creado | DollarSign | info (azul) | "No se han definido presupuestos" |
| Imagen & Video | No hay assets de imagen subidos | Image | info (azul) | "No se han subido imagenes ni videos" |
| EPF | No hay documentos de prensa | FileText | info (azul) | "El EPF esta vacio" |
| Derechos | Publishing o Master splits no suman 100% | AlertTriangle | warning (ambar) | "Los splits de autoria no suman 100% en 2 canciones" |

### Comportamiento

- Los avisos se agrupan por severidad: urgent primero, warning segundo, info tercero
- Cada tarjeta tiene un boton "Ir a seccion" que navega directamente a la seccion correspondiente
- Los avisos de tipo "info" pueden descartarse (se guardan en sessionStorage para no molestar en la sesion)
- Si no hay avisos pendientes, se muestra un chip verde: "Todo al dia"
- El panel tiene un titulo "Centro de Tareas" con un contador de avisos

### Aspecto visual

```text
+------------------------------------------------------+
| Centro de Tareas (4)                                  |
+------------------------------------------------------+
| ! Faltan 5 canciones por inscribir    [Ir a Creditos] |
| ! 3 canciones sin archivo de audio    [Ir a Audio]    |
| i El Cronograma aun no ha sido creado [Ir a Crono]    |
| i El EPF esta vacio                   [Ir a EPF]  [x] |
+------------------------------------------------------+
```

---

### Detalles tecnicos

**Nuevo archivo: `src/components/releases/ReleaseTaskCenter.tsx`**

Componente que recibe el `releaseId` y consulta todos los datos necesarios:
- `useTracks(releaseId)` -- obtiene la lista de tracks
- `useReleaseMilestones(releaseId)` -- obtiene milestones del cronograma
- `useReleaseBudgets(releaseId)` -- obtiene items de presupuesto
- `useReleaseAssets(releaseId)` -- obtiene imagenes/videos/documentos
- Para creditos: consulta `track_credits` agrupados por `track_id` para saber cuantos tracks tienen al menos un credito
- Para audio: consulta `track_versions` agrupados por `track_id` para saber cuantos tracks tienen al menos un archivo

Logica de generacion de avisos:
1. Compara `tracks.length` vs tracks con creditos -> aviso si hay diferencia
2. Compara `tracks.length` vs tracks con versiones de audio -> aviso si hay diferencia
3. Revisa `milestones.length === 0` -> aviso info
4. Filtra milestones con `due_date` en los proximos 7 dias y `status !== 'completed'` -> aviso urgent
5. Filtra milestones con `status === 'delayed'` -> aviso urgent
6. Suma `estimated_cost` vs `actual_cost` en budgets -> aviso si actual > estimated
7. Cuenta assets de tipo `image` o `video` -> aviso info si 0
8. Cuenta assets de tipo `document` -> aviso info si 0

**Archivo modificado: `src/pages/ReleaseDetail.tsx`**

- Importar `ReleaseTaskCenter`
- Añadirlo debajo del grid de secciones, antes de `EditReleaseDialog`:
  ```
  <ReleaseTaskCenter releaseId={id!} onNavigate={handleSectionClick} />
  ```

**Nuevo hook: `src/hooks/useReleaseHealthCheck.ts`**

Hook que centraliza todas las consultas y devuelve un array de avisos tipados:
```
interface ReleaseAlert {
  id: string;
  section: string; // 'creditos' | 'audio' | 'cronograma' | etc.
  severity: 'urgent' | 'warning' | 'info';
  message: string;
  icon: LucideIcon;
  dismissible: boolean;
}
```

Usa los hooks existentes de `useReleases.ts` (`useTracks`, `useReleaseMilestones`, `useReleaseBudgets`, `useReleaseAssets`) mas dos queries adicionales para `track_credits` y `track_versions` agrupados por release.
