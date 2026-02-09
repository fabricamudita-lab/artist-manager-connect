

# Plan: Foto de perfil para contactos

## Resumen

Permitir que cada contacto/miembro de equipo tenga una foto de perfil que se pueda subir directamente desde el panel lateral de perfil. La foto se mostrara en todas las vistas (tarjetas de equipo, grid, vista libre, agenda).

## Cambios necesarios

### 1. Base de datos: nueva columna y bucket de almacenamiento

Crear una migracion SQL que:
- Anada la columna `avatar_url` (text, nullable) a la tabla `contacts`
- Cree un bucket de almacenamiento publico `contact-avatars` para guardar las fotos
- Configure politicas RLS para que los usuarios autenticados puedan subir y gestionar sus propias fotos

### 2. Panel lateral de perfil (`ContactProfileSheet.tsx`)

- Incluir `avatar_url` en la interfaz `ContactData` y en la query de carga
- Reemplazar el avatar estatico (solo iniciales) por uno clicable que permita subir una foto
- Al hacer clic en el avatar, abrir un selector de archivos (input file oculto)
- Al seleccionar imagen: subirla al bucket `contact-avatars`, obtener la URL publica y guardarla en `contacts.avatar_url`
- Mostrar la foto si existe, o las iniciales como fallback
- Anadir un icono de camara sobre el avatar para indicar que es editable

### 3. Tarjetas de miembros (`TeamMemberCard.tsx`, `TeamMemberGrid.tsx`)

- Asegurar que el `avatarUrl` del contacto se pasa correctamente desde `Teams.tsx`
- Las tarjetas ya aceptan `avatarUrl` y usan `AvatarImage`, por lo que solo hay que alimentar el dato desde la tabla `contacts`

### 4. Pagina de Equipos (`Teams.tsx`)

- Al construir los miembros de tipo `profile` (contactos sin cuenta), leer `avatar_url` del contacto y pasarlo como `avatarUrl` a las tarjetas
- Actualmente los contactos-perfil no pasan avatar porque la tabla no tenia el campo

### 5. Agenda (`Agenda.tsx`)

- Mostrar la foto en las tarjetas de contactos de la agenda

## Detalles Tecnicos

### Migracion SQL

```text
-- Columna
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS avatar_url text;

-- Bucket publico
INSERT INTO storage.buckets (id, name, public)
VALUES ('contact-avatars', 'contact-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Politica: usuarios autenticados pueden subir
CREATE POLICY "Users can upload contact avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contact-avatars');

-- Politica: lectura publica
CREATE POLICY "Contact avatars are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'contact-avatars');

-- Politica: usuarios pueden actualizar/borrar sus propios archivos
CREATE POLICY "Users can manage their contact avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'contact-avatars');
```

### UI del avatar en ContactProfileSheet

El avatar tendra un overlay con icono de camara. Al hacer clic se abre un `<input type="file" accept="image/*">` oculto. La imagen se sube a `contact-avatars/{contactId}/{timestamp}.{ext}` y se guarda la URL publica en la columna `avatar_url`.

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| Nueva migracion SQL | Columna + bucket + politicas |
| `src/components/ContactProfileSheet.tsx` | Avatar clicable con upload, mostrar foto |
| `src/pages/Teams.tsx` | Pasar `avatar_url` de contactos a tarjetas |
| `src/pages/Agenda.tsx` | Mostrar avatar en tarjetas de agenda |
| `src/components/DraggableMemberCard.tsx` | Asegurar que pasa avatarUrl (ya lo hace via TeamMemberCard) |

