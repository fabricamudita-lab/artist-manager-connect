
# Plan: Vista Libre con Posicionamiento de Miembros

## Objetivo

Añadir un tercer modo de visualización "libre" en la página de Equipos que permite arrastrar y posicionar los avatares de miembros libremente en un lienzo. Las posiciones se guardan automáticamente para que al regresar a esta vista, cada contacto aparezca exactamente donde lo dejó el usuario.

## Flujo Visual

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Barra de herramientas                                              │
│  ┌────┐ ┌────┐ ┌────┐                                               │
│  │ ▦  │ │ ≡  │ │ ⊕  │  ← Cuadrícula | Fila | Libre                 │
│  └────┘ └────┘ └────┘                                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Vista Libre (modo canvas):                                         │
│                                                                     │
│     ┌───┐                    ┌───┐                                  │
│     │ A │                    │ B │                                  │
│     └───┘                    └───┘                                  │
│                                                                     │
│              ┌───┐    ┌───┐                                         │
│              │ C │    │ D │   ← Grupo creado por el usuario        │
│              └───┘    └───┘                                         │
│                                                                     │
│                              ┌───┐                                  │
│                              │ E │                                  │
│                              └───┘                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Arquitectura de Datos

| Almacenamiento | Clave | Contenido |
|----------------|-------|-----------|
| `localStorage` | `team_member_positions` | `{ [memberId]: { x: number, y: number } }` |

Las posiciones se guardan relativas al contenedor del canvas para mantener consistencia.

## Archivos a Crear/Modificar

### 1. Nuevo componente: `TeamMemberFreeCanvas.tsx`

**Funcionalidad:**
- Renderiza un contenedor tipo "canvas" con posición relativa
- Cada miembro se renderiza como un elemento draggable con posición absoluta
- Al soltar un miembro, guarda su posición en localStorage
- Al montar, carga las posiciones guardadas
- Si un miembro no tiene posición guardada, calcula una posición inicial en grid

**Props:**
```typescript
interface TeamMemberFreeCanvasProps {
  members: Member[];
  onMemberClick?: (member: Member) => void;
  onMemberEdit?: (member: Member) => void;
  onMemberRemove?: (member: Member) => void;
  onMemberEditRole?: (member: Member) => void;
  categories?: Array<{ value: string; label: string }>;
  showActions?: boolean;
}
```

### 2. Nuevo componente: `DraggableMemberCard.tsx`

**Funcionalidad:**
- Wrapper del TeamMemberCard con capacidad de arrastre
- Usa eventos de mouse/touch para drag nativo (sin librería adicional)
- Muestra indicador visual durante el arrastre
- Callback `onPositionChange` al soltar

### 3. Modificar: `src/pages/Teams.tsx`

**Cambios:**
- Actualizar tipo de `viewMode`: `'grid' | 'list' | 'free'`
- Añadir tercer botón de vista con icono `Move` de lucide-react
- Importar y renderizar `TeamMemberFreeCanvas` cuando `viewMode === 'free'`
- Pasar los mismos handlers de click/edit/remove que las otras vistas

## Detalles de Implementación

### Persistencia de Posiciones

```typescript
// Guardar posición
const savePosition = (memberId: string, position: { x: number; y: number }) => {
  const stored = JSON.parse(localStorage.getItem('team_member_positions') || '{}');
  stored[memberId] = position;
  localStorage.setItem('team_member_positions', JSON.stringify(stored));
};

// Cargar posiciones
const loadPositions = (): Record<string, { x: number; y: number }> => {
  return JSON.parse(localStorage.getItem('team_member_positions') || '{}');
};
```

### Posición Inicial para Nuevos Miembros

Cuando un miembro no tiene posición guardada, se calcula automáticamente:
- Se distribuye en una cuadrícula con offset aleatorio pequeño
- Evita superposición con miembros existentes

### Interacción de Arrastre

1. **Mouse down** en el avatar → Iniciar arrastre
2. **Mouse move** → Actualizar posición visual
3. **Mouse up** → Guardar posición en localStorage
4. Botones del dropdown siguen funcionando (no inician arrastre)

### Botón de Reset (opcional)

Se puede añadir un botón "Reorganizar" que:
- Limpia las posiciones guardadas
- Redistribuye todos los miembros en grid ordenado

## Resumen de Cambios

| Archivo | Acción |
|---------|--------|
| `src/components/TeamMemberFreeCanvas.tsx` | Crear - Canvas con posicionamiento libre |
| `src/components/DraggableMemberCard.tsx` | Crear - Wrapper draggable para cards |
| `src/pages/Teams.tsx` | Modificar - Añadir tercer modo de vista |

## Consideraciones Técnicas

- **Sin dependencias nuevas**: Usamos eventos nativos de mouse/touch
- **Responsive**: Las posiciones se almacenan en píxeles relativos al canvas
- **Performance**: Solo actualiza localStorage en `mouseup`, no durante el arrastre
- **Accesibilidad**: El dropdown de acciones sigue siendo accesible via teclado
- **Touch support**: Incluir eventos touch para dispositivos móviles
