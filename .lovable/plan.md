

## Vincular Proveedor a Contactos en Producción Técnica

### Problema
El campo "Proveedor" en el bloque de Producción Técnica es texto libre. El usuario quiere que funcione como selector de contactos (igual que en presupuestos, créditos, etc.) para poder reutilizar y automatizar.

### Cambios

**1. Actualizar interfaz `BacklineItem` en `ProductionBlock.tsx`**
- Añadir campo `provider_contact_id?: string` junto al `provider` existente
- Cuando se selecciona un contacto, guardar su `id` en `provider_contact_id` y su nombre en `provider` (para visualización rápida)

**2. Reemplazar `InlineEditCell` de proveedor por `ContactSelector`**
- Usar el componente `ContactSelector` existente (el mismo que usa Booking y Solicitudes)
- Modo compacto (`compact={true}`) para encajar en la tabla inline
- Al seleccionar un contacto, resolver su nombre y guardarlo en ambos campos

**3. Pasar `artistId` al componente (opcional)**
- Si `ProductionBlock` recibe `artistId` como prop, pasarlo al `ContactSelector` para filtrar contactos del artista
- Si no, mostrar todos los contactos del workspace

### Resultado
- Cada proveedor queda vinculado a un contacto real de la agenda
- Se pueden crear contactos nuevos directamente desde el selector
- Facilita futuras automatizaciones (facturación, comunicación, etc.)
- Los proveedores existentes (texto libre) seguirán mostrándose como fallback

