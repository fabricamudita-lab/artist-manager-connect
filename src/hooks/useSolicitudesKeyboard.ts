import { useEffect, useCallback } from 'react';

interface UseSolicitudesKeyboardProps {
  onNewSolicitud: () => void;
  onApprove?: () => void;
  onDeny?: () => void;
  onToggleView?: (view: 'list' | 'kanban' | 'stats') => void;
  onExport?: () => void;
  enabled?: boolean;
}

export function useSolicitudesKeyboard({
  onNewSolicitud,
  onApprove,
  onDeny,
  onToggleView,
  onExport,
  enabled = true,
}: UseSolicitudesKeyboardProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // No activar si estamos escribiendo en un input
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    // Solo con Ctrl/Cmd para evitar conflictos
    if (e.metaKey || e.ctrlKey) {
      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          onNewSolicitud();
          break;
        case 'a':
          if (onApprove) {
            e.preventDefault();
            onApprove();
          }
          break;
        case 'd':
          if (onDeny) {
            e.preventDefault();
            onDeny();
          }
          break;
        case 'e':
          if (onExport) {
            e.preventDefault();
            onExport();
          }
          break;
        case '1':
          if (onToggleView) {
            e.preventDefault();
            onToggleView('list');
          }
          break;
        case '2':
          if (onToggleView) {
            e.preventDefault();
            onToggleView('kanban');
          }
          break;
        case '3':
          if (onToggleView) {
            e.preventDefault();
            onToggleView('stats');
          }
          break;
      }
    }
  }, [onNewSolicitud, onApprove, onDeny, onToggleView, onExport]);

  useEffect(() => {
    if (!enabled) return;
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}
