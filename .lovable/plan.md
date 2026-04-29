He revisado el estado actual y el caso concreto de Perfil Test:

- Perfil Test está como `workspace_role = MEMBER`, no debería tener bypass de OWNER/TEAM_MANAGER.
- Su rol funcional activo es `Booking Agent`.
- En la matriz, `Booking Agent` tiene `releases = none`.
- Aun así la pantalla de Discografía está renderizando el contenido vacío, así que el problema está en la resolución/uso del permiso en frontend, no en la intención de la matriz.

Plan de corrección:

1. Hacer que `HubGate` resuelva el permiso de forma autoritativa
   - Ahora `HubGate` depende de permisos calculados en el cliente.
   - Lo reforzaré para que, al entrar en un módulo, consulte el permiso funcional real mediante la función de base de datos `get_functional_permission`/RPC equivalente o una comprobación directa fiable.
   - Si `releases = none`, mostrará `ForbiddenView` aunque la query de lanzamientos devuelva 0 filas.

2. Asegurar que Discografía no pueda mostrar empty-state cuando el permiso es `none`
   - En `/releases`, antes de renderizar filtros, botones o “Sin lanzamientos”, se mostrará el bloqueo.
   - Mensaje esperado para Perfil Test:
     `El perfil Booking Agent tiene limitaciones. Tu rol actual no permite ver Releases/Discografía. Pide al creador del workspace que ajuste tus permisos para acceder a esta información.`

3. Corregir el refresco tras cambiar roles desde “Gestionar acceso artista”
   - Invalidar correctamente caché local y queries cuando cambia el rol funcional del contacto espejo.
   - Evitar que una sesión en incógnito mantenga permisos antiguos por caché en memoria durante el TTL.
   - Forzar `bypassCache` en las comprobaciones de entrada a hubs críticos.

4. Alinear cliente y base de datos
   - Revisar `getEffectivePermissions`, `getActiveFunctionalRole` y `useFunctionalPermissions` para que no haya diferencias entre los defaults TypeScript y los defaults guardados en Supabase.
   - Mantener el bypass solo para `OWNER` y `TEAM_MANAGER`, nunca para `MEMBER` con perfil management.

5. Validación específica
   - Verificar con Perfil Test / Booking Agent que `/releases` muestra el mensaje de limitación.
   - Verificar que Booking sigue accesible para Booking Agent.
   - Verificar que OWNER/TEAM_MANAGER siguen viendo Discografía normalmente.
   - Verificar que los botones de creación/importación no aparecen antes del bloqueo.