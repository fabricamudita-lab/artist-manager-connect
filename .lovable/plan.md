

# Boton "Equipos" en Contactos: navegar a la pagina de Equipos

## Problema

El boton "Equipos" en la pagina de Contactos abre un dialogo de gestion de grupos de contactos. El usuario espera que lo lleve directamente a la pagina de Equipos (`/teams`).

## Solucion

Cambiar el `onClick` del boton "Equipos" para que navegue a `/teams` usando `useNavigate` de React Router, en lugar de abrir el dialogo de grupos.

## Cambio

| Archivo | Detalle |
|---|---|
| `src/pages/Agenda.tsx` | Cambiar `onClick={() => setIsManageGroupsOpen(true)}` por `onClick={() => navigate('/teams')}` en el boton "Equipos" (~linea 377). Asegurar que `useNavigate` este importado y disponible. |

No se elimina el dialogo de grupos por si se usa en otro lugar, solo se desconecta del boton.

