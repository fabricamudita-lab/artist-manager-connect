

## Plan: Recuperación de contraseña por email

### Flujo
1. En `/auth` (tab Iniciar Sesión) añadir link **"¿Has olvidado tu contraseña?"** debajo del campo de contraseña.
2. Al hacer click → abre un diálogo modal pidiendo el email y envía el correo de recuperación vía `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`.
3. El usuario recibe el email, hace click en el enlace y aterriza en una nueva página pública `/reset-password` donde introduce la nueva contraseña dos veces.
4. Al confirmar → `supabase.auth.updateUser({ password })` y redirige a `/auth` con toast de éxito.

### Cambios en archivos

| Archivo | Cambio |
|---|---|
| `src/pages/Auth.tsx` | Añadir link "¿Has olvidado tu contraseña?" en el form de signin que abre `ForgotPasswordDialog` |
| `src/components/auth/ForgotPasswordDialog.tsx` (nuevo) | Diálogo con input de email, botón "Enviar enlace de recuperación", llama a `resetPasswordForEmail` con `redirectTo` apuntando a `/reset-password`, toast de confirmación |
| `src/pages/ResetPassword.tsx` (nuevo) | Página pública. Detecta sesión de recovery (Supabase la crea automáticamente al llegar desde el enlace del email), muestra form con dos inputs (nueva contraseña + confirmar), valida que coincidan y mínimo 6 caracteres, llama a `supabase.auth.updateUser({ password })`, redirige a `/auth` con toast |
| `src/App.tsx` | Registrar la nueva ruta pública `/reset-password` (fuera de cualquier guard de autenticación) |

### Detalles UX
- Link en español: **"¿Has olvidado tu contraseña?"** alineado a la derecha bajo el input de contraseña, estilo `text-sm text-primary hover:underline`.
- El diálogo de "olvidé mi contraseña" muestra mensaje de éxito genérico ("Si el email existe, recibirás un enlace") sin revelar si el email está registrado, por seguridad.
- En `/reset-password`: si no hay sesión de recovery activa al cargar, mostrar mensaje "Enlace inválido o expirado" con CTA a `/auth`.
- Mantener el branding visual existente del Auth (gradient bg, card centrada, icono Music).

### Notas técnicas
- Supabase ya está configurado y `signIn`/`signUp` funcionan, así que `resetPasswordForEmail` y `updateUser` están disponibles vía el cliente existente.
- La ruta `/reset-password` debe ser pública (sin requerir sesión normal). Supabase crea una sesión temporal de tipo `recovery` al hacer click en el enlace del email, suficiente para llamar a `updateUser`.
- Recordar al usuario al final que en el panel de Supabase debe asegurarse de que la **Site URL** y las **Redirect URLs** incluyen el dominio publicado (`https://artist-manager-connect.lovable.app`) para que el enlace del email funcione en producción.

