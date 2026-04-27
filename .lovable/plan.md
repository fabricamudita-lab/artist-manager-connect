# Plan: Agrupar el diálogo "Acceso a artistas" por Roster vs Colaboradores

## Problema

En el diálogo actual de **Acceso a artistas** se mezclan en una sola lista todos los perfiles de tipo "artista" (roster + colaboradores), lo que genera confusión. El sistema ya distingue ambos en la tabla `artists` mediante el campo `artist_type` con valores `'roster'` (Mi Roster) y `'collaborator'` (Colaboradores), tal y como se ve en el módulo "Mi Management".

## Cambios

En `src/components/teams/ManageArtistAccessDialog.tsx`:

1. La consulta de artistas pasará a leer también `artist_type` (`select('id, name, stage_name, artist_type')`).
2. La lista se renderizará en **dos secciones claramente separadas**:
   - **Mi Roster** (icono estrella ámbar) — artistas con `artist_type = 'roster'` o nulo (compatibilidad con datos antiguos).
   - **Colaboradores** (icono usuarios) — artistas con `artist_type = 'collaborator'`.
3. Cada sección muestra:
   - Cabecera con icono, título y contador (`Mi Roster · 4`).
   - Si está vacía, un mensaje sutil "No hay artistas en esta categoría".
4. Se conserva el contador global "X artistas seleccionados" en el pie.
5. Sin cambios en lógica de guardado, RLS ni base de datos — solo presentación.

## Resultado visible

Al abrir "Gestionar acceso a artistas" para Perfil Test:

```text
Acceso a artistas

★ Mi Roster · 4
  ☐ Eudald Payés          [Manager ▾]
  ☑ PLAYGRXVND            [Manager ▾]
  ☐ Leyre Estruch         [Manager ▾]
  ☐ VIC                   [Manager ▾]

👥 Colaboradores · 3
  ☐ Ana Ayala             [Manager ▾]
  ☐ Jay Jules             [Manager ▾]
  ☐ Kris Tena             [Manager ▾]
```

Mucho más fácil entender a qué le estás dando acceso.

## Fuera de alcance

- No tocamos los roles funcionales ni las RLS aplicadas en Phase 2.
- No cambiamos el resto del flujo (botón de entrada, guardado, permisos requeridos).
