
# Modulo de Correo Integrado

## Vision

Un cliente de email completo dentro de la aplicacion que permite leer, enviar, responder, gestionar adjuntos y carpetas, con vinculacion automatica a contactos existentes y vinculacion manual a bookings/proyectos/solicitudes. Compatible con Gmail y Outlook/Microsoft 365.

## Arquitectura General

```text
+-------------------+       +---------------------+       +------------------+
|   Frontend React  | ----> | Edge Functions      | ----> | Gmail API /      |
|   (Correo page)   |       | (proxy + cache)     |       | Microsoft Graph  |
+-------------------+       +---------------------+       +------------------+
         |                           |
         v                           v
+-------------------+       +---------------------+
|   Supabase DB     |       | Supabase Secrets    |
|   (metadata,      |       | (OAuth tokens,      |
|    vinculaciones)  |       |  refresh tokens)    |
+-------------------+       +---------------------+
```

## Fase 1: Infraestructura OAuth y conexion de cuentas

### 1.1 Tablas nuevas en Supabase

**`email_accounts`** - Cuentas de correo vinculadas
- id, user_id, provider (gmail/outlook), email_address, display_name
- access_token (encriptado), refresh_token (encriptado), token_expires_at
- sync_enabled, last_sync_at, sync_cursor (para sincronizacion incremental)
- created_at, updated_at

**`email_messages`** - Metadata de correos (cache local)
- id, email_account_id, provider_message_id (ID en Gmail/Outlook)
- subject, from_address, from_name, to_addresses (jsonb), cc_addresses (jsonb)
- snippet (preview del cuerpo), body_html, body_text
- date, is_read, is_starred, is_draft, has_attachments
- folder (inbox/sent/drafts/trash/archive), labels (jsonb)
- thread_id (para agrupar conversaciones)
- created_at

**`email_attachments`** - Adjuntos de correos
- id, email_message_id, filename, mime_type, size_bytes
- provider_attachment_id (para descarga bajo demanda)

**`email_links`** - Vinculaciones de correos a entidades
- id, email_message_id, link_type (contact/booking/project/solicitud/budget)
- linked_entity_id, linked_automatically (boolean), linked_by, created_at

**`email_signatures`** - Firmas de correo del usuario
- id, user_id, name, html_content, is_default, created_at

### 1.2 Edge Functions para OAuth

**`email-oauth`** - Maneja el flujo OAuth2
- GET /authorize?provider=gmail|outlook - Genera URL de autorizacion
- POST /callback - Recibe el codigo y lo intercambia por tokens
- POST /refresh - Renueva tokens expirados
- DELETE /disconnect - Desconecta una cuenta

Para Gmail: usar Google OAuth2 con scopes `gmail.readonly`, `gmail.send`, `gmail.modify`
Para Outlook: usar Microsoft Identity Platform con scopes `Mail.ReadWrite`, `Mail.Send`

Los tokens se almacenan en `email_accounts` (encriptados con la clave del servidor).

### 1.3 Secretos necesarios

- GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET (para Gmail OAuth)
- MICROSOFT_CLIENT_ID + MICROSOFT_CLIENT_SECRET (para Outlook OAuth)
- EMAIL_ENCRYPTION_KEY (para encriptar tokens en la DB)

## Fase 2: Sincronizacion y lectura de correos

### 2.1 Edge Function `email-sync`

- Sincronizacion incremental usando delta/history API:
  - Gmail: `history.list` con startHistoryId
  - Outlook: `delta` endpoint con deltaLink
- Primera sincronizacion: ultimos 30 dias o 500 correos
- Guarda metadata en `email_messages`, no el cuerpo completo (se carga bajo demanda)
- Ejecuta vinculacion automatica: compara from/to con emails en tabla `contacts`

### 2.2 Edge Function `email-api`

Endpoints para el frontend:
- GET /messages?folder=inbox&page=1 - Lista mensajes (desde cache local)
- GET /messages/:id - Detalle completo (carga body del proveedor si no esta en cache)
- GET /messages/:id/attachments/:attachmentId - Descarga adjunto
- POST /messages/:id/read - Marcar como leido
- POST /messages/:id/star - Marcar como destacado
- POST /messages/:id/archive - Archivar
- DELETE /messages/:id - Mover a papelera
- GET /threads/:threadId - Obtener conversacion completa

### 2.3 Vinculacion automatica

Al sincronizar cada correo:
1. Extraer todas las direcciones email (from, to, cc)
2. Buscar en tabla `contacts` por coincidencia de email
3. Si hay match, crear registro en `email_links` con `linked_automatically = true`
4. Opcionalmente buscar en `booking_offers` por nombre de contacto para sugerir vinculos

## Fase 3: Envio y respuesta de correos

### 3.1 Edge Function `email-send`

- POST /send - Enviar nuevo correo
  - to, cc, bcc, subject, body (HTML), attachments, signature_id
  - link_to (opcional): array de {type, id} para vincular automaticamente
- POST /reply - Responder a un correo
  - message_id, body, reply_all (boolean)
- POST /forward - Reenviar correo
- POST /draft - Guardar borrador

Usa Gmail API `messages.send` o Microsoft Graph `sendMail`.

## Fase 4: Frontend - Pagina de Correo

### 4.1 Nueva pagina `/correo`

Estructura tipo cliente de email moderno:

```text
+--sidebar--+--------lista--------+-------detalle--------+
| Bandeja   | [*] Asunto correo 1 | De: Juan Garcia      |
| Enviados  | [ ] Asunto correo 2 | Para: Mi             |
| Borradores| [*] Asunto correo 3 | Fecha: 15 feb 2026   |
| Papelera  |                     |                      |
| Archivo   |                     | Cuerpo del email...  |
|           |                     |                      |
| ---       |                     | [Responder] [Reenviar|
| Vinculos: |                     |                      |
| 3 Contact.|                     | Vinculado a:         |
| 1 Booking |                     | - Juan (contacto)    |
|           |                     | + Vincular a...      |
+-----------+---------------------+----------------------+
```

### 4.2 Componentes principales

- **EmailSidebar** - Carpetas, cuentas conectadas, filtros
- **EmailList** - Lista de correos con preview, badges de vinculacion
- **EmailDetail** - Vista completa del correo con cuerpo, adjuntos, acciones
- **EmailComposer** - Editor de correos con formato, adjuntos, firma
- **EmailLinkDialog** - Dialog para vincular manualmente a booking/proyecto/solicitud
- **EmailAccountSettings** - Conectar/desconectar cuentas Gmail/Outlook

### 4.3 Vinculacion manual desde el detalle

En cada correo abierto, seccion "Vinculado a:" con:
- Vinculaciones automaticas ya detectadas (con badge "auto")
- Boton "+ Vincular a..." que abre selector de entidad (contacto, booking, proyecto, solicitud, presupuesto)
- Las entidades vinculadas son clicables y navegan al detalle correspondiente

### 4.4 Vista inversa en otras paginas

En las paginas de Contactos, Bookings, Proyectos, etc., agregar seccion "Correos vinculados" mostrando los emails asociados a esa entidad.

## Fase 5: Busqueda y funciones avanzadas

- Buscador full-text en asunto y snippet (via Supabase full-text search)
- Filtros por fecha, remitente, tiene adjuntos, vinculado/no vinculado
- Notificaciones de nuevos correos (polling cada 2-3 minutos)
- Firmas personalizables por cuenta
- Vista de conversacion (thread view)

## Plan de implementacion por pasos

El desarrollo se haria en este orden:

1. **Paso 1**: Crear tablas en Supabase + RLS policies
2. **Paso 2**: Edge function de OAuth (Gmail primero, luego Outlook)
3. **Paso 3**: Pagina de settings para conectar cuenta
4. **Paso 4**: Edge function de sync + lectura
5. **Paso 5**: Frontend de bandeja de entrada (lista + detalle)
6. **Paso 6**: Vinculacion automatica + manual
7. **Paso 7**: Envio y respuesta de correos
8. **Paso 8**: Busqueda, filtros, firmas
9. **Paso 9**: Soporte Outlook (Microsoft Graph)
10. **Paso 10**: Vista inversa en contactos/bookings/proyectos

## Requisitos previos

Antes de empezar necesitaremos:
- Crear un proyecto en Google Cloud Console y configurar OAuth2 (Gmail API)
- Crear una app en Microsoft Entra ID (Azure AD) para Outlook
- Configurar los secretos en Supabase

## Seccion tecnica - Detalles de implementacion

### Tokens OAuth
Los access tokens de Gmail duran 1 hora, los de Microsoft 1 hora tambien. El edge function `email-api` verificara `token_expires_at` antes de cada llamada y renovara automaticamente usando el refresh token.

### Sincronizacion incremental
Gmail usa `historyId` - cada vez que sincronizamos guardamos el ultimo historyId y en la siguiente sync solo pedimos los cambios desde ese punto. Microsoft usa `deltaLink` con el mismo concepto. Esto minimiza las llamadas a la API.

### Limites de API
- Gmail: 250 unidades de cuota por usuario por segundo, 1 billon por dia
- Microsoft Graph: 10.000 requests por 10 minutos por mailbox
- La sincronizacion se hara conservadoramente para no exceder limites

### Seguridad
- Tokens encriptados en la DB con AES-256
- RLS policies aseguran que cada usuario solo ve sus propias cuentas y correos
- Edge functions validan el JWT del usuario antes de cada operacion
- Los cuerpos de email se cargan bajo demanda, no se cachean permanentemente por privacidad

### Archivos nuevos principales
- `supabase/functions/email-oauth/index.ts`
- `supabase/functions/email-api/index.ts`
- `supabase/functions/email-send/index.ts`
- `supabase/functions/email-sync/index.ts`
- `src/pages/Correo.tsx`
- `src/components/email/EmailSidebar.tsx`
- `src/components/email/EmailList.tsx`
- `src/components/email/EmailDetail.tsx`
- `src/components/email/EmailComposer.tsx`
- `src/components/email/EmailLinkDialog.tsx`
- `src/components/email/EmailAccountSettings.tsx`
- `src/hooks/useEmail.ts`
- `src/hooks/useEmailSync.ts`
- Migracion SQL para las 5 tablas nuevas
