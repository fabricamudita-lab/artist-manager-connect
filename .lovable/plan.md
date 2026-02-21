

# Renombrar tab "Equipo" a "Formatos" y mostrar formatos inline

Reemplazar el contenido de la tab "Equipo" (que muestra miembros del equipo asignados) por el formulario de formatos de booking que actualmente aparece al hacer clic en "Configurar Formatos". El usuario no tendra que abrir ningun dialog -- los formatos se veran directamente en la tab.

---

## Cambios

### 1. Extraer contenido del dialog a un componente reutilizable

**Archivo: `src/components/ArtistFormatsDialog.tsx`**

- Extraer toda la logica interna del dialog (queries, estados, handlers, UI) a un nuevo componente exportado `ArtistFormatsContent` que recibe `artistId` y `artistName` como props.
- `ArtistFormatsDialog` pasa a ser un wrapper simple: renderiza `Dialog` > `DialogContent` > `ArtistFormatsContent`.
- Esto permite reusar `ArtistFormatsContent` tanto en el dialog (si se usa desde otro lugar) como inline en la tab.

### 2. Reemplazar tab "Equipo" por "Formatos"

**Archivo: `src/pages/ArtistProfile.tsx`**

- Renombrar `TabsTrigger value="team"` de "Equipo" a "Formatos" (con icono `Settings2` en vez de `Users`).
- En `TabsContent value="team"`, eliminar todo el bloque de equipo (header con botones, grid de miembros agrupados por categoria, empty state).
- En su lugar, renderizar `<ArtistFormatsContent artistId={id} artistName={artist.stage_name || artist.name} />` directamente.
- Eliminar `showFormatsDialog` state y el render de `ArtistFormatsDialog` al final del archivo (ya no se necesita el dialog).
- Eliminar `showAddTeamMember` state y el render de `AddTeamContactDialog` (la gestion de equipo se hace desde la pagina de Equipos).
- Limpiar imports no usados: `AddTeamContactDialog`, `ArtistFormatsDialog`.

### 3. Actualizar stat "Equipo" en el header

- Mantener la stat card "Equipo" con su valor (`teamMembers.length`) y su enlace a `/teams?artistId=...` ya que sigue siendo util como indicador rapido. No se elimina.

---

## Resultado

- La tab se llama "Formatos" y muestra directamente los presets rapidos, los formatos existentes con sus crews, cachés, riders, etc.
- No hay que hacer clic en "Configurar Formatos" -- ya esta todo visible.
- La gestion del equipo sigue accesible desde la pagina de Equipos y desde la stat card del header.

## Detalle tecnico

El componente `ArtistFormatsContent` mantendra exactamente la misma logica que tiene `ArtistFormatsDialog` internamente (queries de `booking_products`, `booking_product_crew`, team members, drag-and-drop, save mutation, etc.), pero sin el wrapper `Dialog`/`DialogContent`/`DialogHeader`. Incluira el boton "Guardar Formatos" al final.

| Archivo | Cambio |
|---|---|
| `src/components/ArtistFormatsDialog.tsx` | Extraer logica a `ArtistFormatsContent` (exportado). Dialog se convierte en wrapper |
| `src/pages/ArtistProfile.tsx` | Tab "Equipo" pasa a "Formatos", renderiza `ArtistFormatsContent` inline, elimina dialog y team member grid |
