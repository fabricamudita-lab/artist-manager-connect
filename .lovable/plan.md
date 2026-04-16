

El error "FunctionsFetchError: Failed to send a request to the Edge Function" indica que la Edge Function `check-contact-references` no está desplegada o falló al desplegarse (probablemente por el error previo de `canvas.node` en `esm.sh`).

Aunque ya cambié los imports a `npm:`, la función nunca llegó a desplegarse correctamente. Necesito forzar el redespliegue de ambas Edge Functions.

## Plan: Redesplegar las Edge Functions de borrado de contacto

1. Forzar redespliegue de `check-contact-references` y `delete-contact` con los imports `npm:` ya corregidos.
2. Verificar logs tras el despliegue para confirmar que arrancan sin error.

Sin cambios de código adicionales — solo redespliegue.

