import { useEffect, useCallback, useState } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  callback: () => void;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const {
        key,
        ctrlKey = false,
        metaKey = false,
        shiftKey = false,
        altKey = false,
        callback,
        preventDefault = true
      } = shortcut;

      const isMatch = 
        event.key.toLowerCase() === key.toLowerCase() &&
        event.ctrlKey === ctrlKey &&
        event.metaKey === metaKey &&
        event.shiftKey === shiftKey &&
        event.altKey === altKey;

      if (isMatch) {
        if (preventDefault) {
          event.preventDefault();
          event.stopPropagation();
        }
        callback();
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

export function useGlobalSearch() {
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  const handleGlobalSearch = useCallback(() => {
    setShowGlobalSearch(true);
  }, []);

  useKeyboardShortcuts([
    {
      key: 'k',
      ctrlKey: true,
      callback: handleGlobalSearch
    },
    {
      key: 'k',
      metaKey: true,
      callback: handleGlobalSearch
    }
  ]);

  return { showGlobalSearch, setShowGlobalSearch, handleGlobalSearch };
}