
# Manual de Uso - MOODITA: Plataforma de Gestion Artistica

---

## 1. ACCESO Y AUTENTICACION

### 1.1 Iniciar sesion
- Accede a la URL de la aplicacion
- Introduce tu email y contrasena
- Si es tu primera vez, registrate con tu email

### 1.2 Roles del sistema
La plataforma tiene dos roles principales:
- **Management**: Acceso completo a todas las herramientas (booking, discografia, proyectos, sincronizaciones, equipos, contactos, analytics, ajustes)
- **Colaborador**: Acceso limitado a los artistas y proyectos donde ha sido asignado

El rol activo se puede cambiar desde el selector en la parte inferior de la barra lateral.

---

## 2. NAVEGACION PRINCIPAL (Barra lateral)

La barra lateral se divide en secciones:

### PRINCIPAL
| Seccion | Descripcion |
|---------|-------------|
| **Dashboard** | Vista general con resumen de actividad, proximos eventos y estadisticas |
| **Artistas** | Listado del roster de artistas gestionados. Punto de entrada a toda la informacion de cada artista |
| **Drive** | Gestor de archivos organizado por artista y categorias (Conciertos, Prensa, Legal, etc.) |
| **Calendario** | Vista semanal, mensual, trimestral o anual de todos los eventos |
| **Action Center** | Centro de solicitudes y aprobaciones (entrevistas, bookings, consultas, informacion, otros) |
| **Finanzas** | Presupuestos, royalties, liquidaciones y tendencias financieras |

### GESTION (solo rol Management)
| Seccion | Descripcion |
|---------|-------------|
| **Booking** | Gestion completa de ofertas de conciertos |
| **Sincronizaciones** | Gestion de ofertas de sincronizacion (cine, TV, publicidad) |
| **Hojas de Ruta** | Roadmaps logisticos para eventos y giras |
| **Proyectos** | Gestion de proyectos con checklist, archivos y seguimiento |
| **Discografia** | Gestion de lanzamientos (singles, EPs, albums) |

### HERRAMIENTAS
| Seccion | Descripcion |
|---------|-------------|
| **Correo** | Gestor de correo electronico integrado |
| **Chat** | Canales de comunicacion interna |
| **Documentos** | Generador de contratos y documentos |
| **EPKs** | Electronic Press Kits - dossiers de prensa digitales |
| **Analytics** | Estadisticas y metricas (solo Management) |

### ADMINISTRACION (solo rol Management)
| Seccion | Descripcion |
|---------|-------------|
| **Equipos** | Gestion de miembros del equipo organizados por artista y categoria |
| **Contactos** | Agenda de contactos profesionales con etiquetas |
| **Mi Perfil** | Datos personales, documentos de identidad, informacion financiera |
| **Ajustes** | Preferencias de notificaciones, privacidad y apariencia |

La barra lateral se puede colapsar/expandir con el icono de menu en la esquina superior.

---

## 3. ARTISTAS (Mi Management)

### 3.1 Crear un artista
1. Ve a **Artistas** en la barra lateral
2. Pulsa **"Nuevo Artista"**
3. Rellena nombre, nombre artistico y descripcion
4. El artista aparecera en el roster

### 3.2 Ficha de artista
Al hacer clic en un artista, accedes a su ficha que muestra:
- Informacion basica
- Accesos directos a Booking, Discografia, Finanzas, Calendario, Carpetas y Sincronizaciones filtrados por ese artista

---

## 4. BOOKING

### 4.1 Vista general
El modulo de Booking muestra todas las ofertas de conciertos. Tiene dos vistas:
- **Lista/Tabla**: Vista tabular con todas las columnas configurables
- **Kanban**: Vista de tarjetas organizadas por fases

### 4.2 Fases del Booking (flujo Kanban)
Las ofertas pasan por las siguientes fases:

```text
Interes -> Oferta -> Negociacion -> Confirmado -> Facturado -> Cerrado
                                                              |
                                                         Cancelado
```

- **Interes**: Primera toma de contacto o solicitud recibida
- **Oferta**: Se ha enviado o recibido una propuesta economica
- **Negociacion**: Se estan negociando condiciones
- **Confirmado**: Evento confirmado por ambas partes
- **Facturado**: Factura emitida
- **Cerrado**: Evento completamente liquidado
- **Cancelado**: Evento cancelado

### 4.3 Crear una oferta de booking
1. Pulsa **"+ Crear Booking"**
2. Rellena los campos:
   - **Artista**: Selecciona del roster
   - **Fecha y hora** del evento
   - **Festival/Ciclo**: Nombre del evento
   - **Venue/Lugar**: Recinto o sala
   - **Ciudad y Pais**
   - **Capacidad**: Aforo del recinto
   - **Promotor**: Nombre del promotor
   - **Fee**: Cache acordado (en euros)
   - **Formato**: Tipo de show (acustico, banda completa, DJ, etc.)
   - **Contacto**: Selecciona de la agenda de contactos
   - **Estado/Fase**: Fase inicial de la oferta
   - **CityZen / Internacional**: Marcadores especiales
   - **Link de venta, Condiciones, Notas**: Campos adicionales

### 4.4 Alerta de confirmacion
Cuando se intenta crear o mover un booking a estado **"Confirmado"**, el sistema muestra un dialogo con dos opciones:
- **"Consultar disponibilidad y viabilidad"** (opcion recomendada): Crea el booking en fase "Interes" con estado "Pendiente" para verificar la disponibilidad del equipo primero
- **"Confirmar directamente"**: Confirma inmediatamente sin verificaciones

Esto aplica al crear, editar o arrastrar en Kanban.

### 4.5 Detalle de un booking
Al hacer clic en una oferta, se accede al detalle con pestanas:
- **Vista General**: Datos principales, contacto, promotor, fee, validaciones
- **Hoja de Ruta**: Roadmap logistico del evento
- **Gastos**: Registro de gastos asociados al evento
- **Documentos**: Contratos y archivos adjuntos
- **Carpeta**: Acceso a la carpeta del evento en Drive

### 4.6 Disponibilidad y Viabilidad
Desde el detalle de un booking:
- **Solicitar disponibilidad**: Envia consultas al equipo para confirmar que estan disponibles en la fecha
- **Chequeos de viabilidad**: Permite que manager, artista y tecnico aprueben el evento

### 4.7 Validaciones automaticas
El sistema valida automaticamente:
- **Conflicto de fechas**: No permite dos confirmados en la misma fecha para el mismo artista
- **Contacto obligatorio**: Para propuestas y confirmados
- **Contratos obligatorios**: Para ofertas confirmadas
- **Link de venta**: Aviso para shows confirmados futuros sin link
- **Lead time**: Aviso si el evento esta a menos de 14 dias

### 4.8 Filtros
Los filtros disponibles son:
- Busqueda por texto (venue, ciudad, festival)
- Filtro por artista
- Filtro por fase (interes, oferta, negociacion, confirmado, etc.)
- Filtro por pais
- Filtro por promotor
- Rango de fechas
- Internacional (si/no)
- CityZen (si/no)

### 4.9 Exportar
Puedes exportar los bookings a CSV desde el boton de descarga.

---

## 5. ACTION CENTER (Solicitudes)

### 5.1 Tipos de solicitudes
- **Entrevista**: Solicitudes de medios de comunicacion
- **Booking**: Propuestas de conciertos
- **Consulta**: Preguntas internas o externas
- **Informacion**: Solicitudes de informacion
- **Otro**: Cualquier otra solicitud

### 5.2 Crear una solicitud
1. Pulsa **"+ Nueva Solicitud"** (o usa el atajo de teclado)
2. Selecciona el tipo
3. Rellena los campos segun el tipo:
   - Entrevista: medio, entrevistador, programa, hora
   - Booking: festival, lugar, ciudad, hora del show
   - Consulta/Informacion/Otro: descripcion libre
4. Asigna a un artista
5. Opcionalmente establece una fecha limite de respuesta

### 5.3 Estados
- **Pendiente**: Sin resolver
- **Aprobada**: Aceptada
- **Denegada**: Rechazada

### 5.4 Vistas
- **Lista**: Vista tabular
- **Kanban**: Tarjetas por estado
- **Estadisticas**: Graficos y metricas

### 5.5 Acciones
- Cambiar estado con comentario de decision
- Archivar/desarchivar solicitudes
- Asociar a un proyecto existente
- Crear proyecto desde la solicitud
- Programar encuentro
- Seleccion multiple para acciones en lote
- Exportar a CSV

### 5.6 Atajos de teclado
- `N`: Nueva solicitud
- `L/K/S`: Cambiar vista (Lista/Kanban/Stats)
- `E`: Exportar

---

## 6. CALENDARIO

### 6.1 Vistas
- **Semana**: Vista semanal detallada
- **Mes**: Vista mensual con puntos de color
- **Trimestre**: Vista de 3 meses
- **Ano**: Vista anual completa

### 6.2 Crear evento
1. Pulsa **"+ Evento"**
2. Rellena titulo, fecha inicio, fecha fin, tipo, ubicacion
3. Asigna a un artista

### 6.3 Filtros
- Por artista (multiples)
- Por proyecto
- Por equipo
- Por departamento

### 6.4 Exportar calendario
Puedes exportar el calendario en formato iCal (.ics) para importar en Google Calendar, Apple Calendar, etc.

---

## 7. FINANZAS

### 7.1 Pestanas disponibles

| Pestana | Descripcion |
|---------|-------------|
| **Resumen** | Vision general financiera con graficos |
| **Presupuestos** | Gestion de presupuestos por proyecto/evento |
| **Canciones & Splits** | Registro de canciones con sus porcentajes de autoria (splits) |
| **Ganancias** | Registro de ingresos por plataforma (Spotify, Apple Music, etc.) |
| **Liquidacion** | Calculadora de liquidaciones y pagos pendientes |
| **Tendencias** | Graficos de evolucion de ingresos |

### 7.2 Filtro por artista
Todas las pestanas se pueden filtrar por artista usando el selector superior.

### 7.3 Presupuestos
- Crear presupuestos con partidas detalladas
- Comparar gastos estimados vs reales
- Versionar presupuestos

### 7.4 Royalties y Splits
- Registrar canciones con sus colaboradores
- Definir porcentajes de autoria (compositor, letrista, productor, interprete)
- Importar ganancias por plataforma
- Calcular distribuciones automaticas

---

## 8. DISCOGRAFIA (Releases)

### 8.1 Crear un lanzamiento
1. Pulsa **"+ Nuevo Release"**
2. Tipo: Single, EP o Album
3. Nombre, artista, fecha de lanzamiento, sello
4. Estado: Planificando, En Progreso, Publicado, Archivado

### 8.2 Secciones de un lanzamiento
Cada release tiene 6 secciones:

| Seccion | Contenido |
|---------|-----------|
| **Cronograma** | Timeline con hitos y tareas del lanzamiento (Gantt) |
| **Presupuestos** | Control de gastos estimados vs reales |
| **Imagen & Video** | Galeria de fotos y videoclips |
| **Creditos y Autoria** | Compositores, productores, colaboradores |
| **Audio** | Tracklist y versiones de audio |
| **EPF** | Electronic Press Folder - documentos de prensa |

### 8.3 Vistas
- **Tarjetas**: Vista de cards por release
- **Cronogramas**: Vista general de todos los cronogramas activos

---

## 9. SINCRONIZACIONES

### 9.1 Que es
Gestion de ofertas de sincronizacion: uso de musica en cine, television, publicidad, videojuegos, etc.

### 9.2 Crear oferta de sincronizacion
Campos principales:
- Titulo de la produccion
- Tipo de produccion (pelicula, serie, anuncio, etc.)
- Productora, director, territorio
- Cancion y artista
- Tipo de uso y duracion
- Presupuesto total, fee de sync, fee de master
- Porcentajes de master y editorial
- Contacto del solicitante

### 9.3 Fases
Las ofertas pasan por un flujo Kanban similar al booking.

### 9.4 Formulario publico
Puedes generar un enlace publico para que terceros envien solicitudes de sincronizacion directamente.

---

## 10. HOJAS DE RUTA (Roadmaps)

### 10.1 Que es
Documento logistico para eventos que contiene toda la informacion operativa: horarios, viajes, hospitality, equipo, contactos, produccion.

### 10.2 Crear hoja de ruta
1. Pulsa **"+ Nueva Hoja de Ruta"**
2. Asigna un nombre (si se crea desde un booking, se sugiere automaticamente con formato: `DD.MM.YYYY Artista (Venue, Ciudad)`)
3. Asigna artista
4. Opcionalmente vincula a un booking existente

### 10.3 Bloques del roadmap
Un roadmap se compone de bloques:
- **Cabecera**: Informacion general del evento
- **Horarios**: Timeline del dia
- **Viajes**: Transporte ida y vuelta
- **Hospitality**: Catering, alojamiento, backstage
- **Produccion**: Rider tecnico, backline, sonido
- **Contactos**: Personas clave del evento
- **Equipo**: Miembros del equipo asignados

### 10.4 Estados
- Borrador
- Confirmado
- En Revision
- Cancelado

---

## 11. CONTACTOS

### 11.1 Dos sistemas de contactos

#### Equipos (Teams)
Para **miembros del equipo** que trabajan contigo directamente. Informacion detallada:
- Nombre completo, DNI, IBAN, direccion
- Telefono, email, contacto de emergencia
- Tallas de ropa y calzado
- Alergias, fumador, tipo de carnet
- Categoria: Banda, Artistico, Tecnico, Management, Comunicacion, Legal, Produccion, Tour Manager, Booking, Compositor, Letrista, Productor, Interprete, Sello, Editorial, Otros

#### Agenda
Para **contactos profesionales** externos. Informacion minima y flexible:
- Nombre, email, telefono
- Etiquetas libres por profesion (#prensa, #tourmanager), ubicacion (#barcelona, #paris), o entidad (#sonar, #primavera)
- Categoria unificada con Equipos

### 11.2 Gestion de equipos
- Organiza miembros por artista
- Vistas: Cuadricula, Lista, Lienzo libre
- Filtra por categoria o equipo
- Gestiona categorias personalizadas
- Crea equipos nombrados (ej: "La Banda", "Equipo Tour")

### 11.3 Gestion de agenda
- Vista de tarjetas o Rolodex (como una agenda de movil)
- Filtra por categoria, busqueda de texto
- Comparte contactos
- Grupos de contactos para envios masivos

---

## 12. MI PERFIL

### 12.1 Secciones del perfil
- **Identificacion**: Nombre artistico, nombres, DNI/NIE, fecha nacimiento, seguridad social
- **Direccion**: Calle, codigo postal, ciudad, provincia, pais
- **Tallas**: Calzado, pantalon, camisa, chaqueta, altura
- **Salud y Otros**: Alergias, fumador
- **Contacto y Financiero**: Telefono, IBAN
- **Observaciones**: Notas libres
- **Documentos**: Fotos de DNI, pasaporte, carnet de conducir (almacenamiento privado)

Solo se muestran los campos que estan rellenados.

---

## 13. DRIVE (Carpetas)

### 13.1 Estructura
Archivos organizados por artista con categorias predefinidas:
- Conciertos (con subcarpetas automaticas por evento)
- Prensa
- Legal
- Fotos
- Videos
- Musica
- Documentos
- Otros

### 13.2 Funcionalidades
- Subir archivos
- Crear subcarpetas
- Compartir archivos con enlace publico
- Vista de archivos por evento (Conciertos)

---

## 14. PROYECTOS

### 14.1 Crear proyecto
- Nombre, descripcion, artista
- Fecha inicio y fin
- Estado y prioridad

### 14.2 Funcionalidades
- Checklist de tareas
- Archivos adjuntos
- Compartir proyecto con enlace publico
- Progreso visual
- Vincular a solicitudes y bookings

---

## 15. EPKs (Electronic Press Kit)

### 15.1 Que es
Dossier de prensa digital que se puede compartir con un enlace publico.

### 15.2 Crear EPK
- Selecciona artista
- Configura secciones: biografia, fotos, videos, discografia, fechas de gira, contacto
- Personaliza colores y diseno
- Opcionalmente protege con contrasena

### 15.3 Compartir
- Genera URL publica (ej: `/epk/nombre-artista`)
- Copia el enlace y compartelo con periodistas, promotores, etc.
- Proteccion opcional con contrasena

---

## 16. DOCUMENTOS Y CONTRATOS

### 16.1 Generador de contratos
- Plantillas predefinidas: Contrato estandar, Contrato festival
- Placeholders automaticos: nombre artista, NIF, fecha, venue, cache, etc.
- Genera PDF descargable

### 16.2 Firma digital
- Envia contratos para firma via enlace publico
- Multiples firmantes
- Seguimiento del estado de firma

---

## 17. PERMISOS Y ROLES (RBAC)

### 17.1 Niveles de acceso
El sistema usa 3 niveles jerarquicos:

```text
WORKSPACE (nivel organizacion)
  -> ARTIST (nivel artista)
    -> PROJECT (nivel proyecto)
```

### 17.2 Roles por nivel

**Workspace:**
- **Owner**: Acceso total, facturacion, invitar usuarios, crear artistas
- **Team Manager**: Invitar usuarios, crear artistas, ver todo

**Artista:**
- **Artist Manager**: Control total sobre proyectos del artista, ventas, calendario
- **Artist Observer**: Solo lectura (dashboard, ventas, calendario)

**Proyecto:**
- **Editor**: Ver, editar, crear tareas, enviar presupuestos, cambiar estados, subir archivos
- **Commenter**: Ver proyecto, comentar, aprobar si esta asignado
- **Viewer**: Solo lectura

### 17.3 Herencia
Los permisos se heredan hacia abajo:
- Un Owner de Workspace tiene acceso a TODO
- Un Manager de Artista tiene acceso a TODOS los proyectos de ese artista
- Un Editor de Proyecto solo tiene acceso a ESE proyecto

---

## 18. NOTIFICACIONES

- Campana de notificaciones en la barra lateral
- Alertas de recordatorios de booking
- Alertas de validacion (campos faltantes, conflictos de fecha)
- Notificaciones de cambios de estado en solicitudes

---

## 19. BUSQUEDA GLOBAL

Accede con el atajo de teclado o desde el icono de busqueda para encontrar rapidamente:
- Bookings
- Solicitudes
- Contactos
- Proyectos
- Releases

---

## 20. AJUSTES

### 20.1 Notificaciones
- Activar/desactivar notificaciones por email
- Activar/desactivar notificaciones push

### 20.2 Privacidad
- Perfil publico si/no
- Autenticacion de dos factores

### 20.3 Apariencia
- Modo oscuro / claro

### 20.4 Idioma
- Configuracion de idioma

---

## 21. ENLACES PUBLICOS

La plataforma genera varios tipos de enlaces publicos para compartir con terceros:
- **EPK**: Dossier de prensa `/epk/slug`
- **Proyecto compartido**: `/shared/project/token`
- **Archivo compartido**: `/shared/token`
- **Firma de contrato**: `/sign/token`
- **Formulario de sincronizacion**: `/sync-request/token`
- **Formulario de artista**: `/artist-form/token`

---

## 22. RESUMEN DE ATAJOS

| Atajo | Accion |
|-------|--------|
| `N` | Nueva solicitud (en Action Center) |
| `L` | Vista lista |
| `K` | Vista Kanban |
| `S` | Vista estadisticas |
| `E` | Exportar |
