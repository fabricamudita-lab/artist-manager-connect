import { useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Hook that reads `?alert=<id>` from the URL, exposes the alertId,
 * and provides a utility to scroll-to + flash-highlight a DOM element.
 * Automatically clears the param after consumption.
 */
export function useAlertHighlight() {
  const [searchParams, setSearchParams] = useSearchParams();
  const alertId = searchParams.get('alert');
  const consumed = useRef(false);

  // Clear param once after first render that reads it
  useEffect(() => {
    if (alertId && !consumed.current) {
      consumed.current = true;
      const timeout = setTimeout(() => {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('alert');
          return next;
        }, { replace: true });
      }, 500); // small delay to let sections read the value
      return () => clearTimeout(timeout);
    }
  }, [alertId, setSearchParams]);

  /**
   * Scroll to an element and apply a temporary ring highlight.
   * @param element - DOM element or CSS selector string
   * @param ringClass - Tailwind ring classes (default: amber warning ring)
   * @param duration - How long the highlight stays (ms), default 3000
   */
  const highlightElement = useCallback(
    (
      element: HTMLElement | string | null,
      ringClass = 'ring-2 ring-amber-500 ring-offset-2',
      duration = 3000
    ) => {
      const el =
        typeof element === 'string'
          ? document.querySelector<HTMLElement>(element)
          : element;

      if (!el) return;

      // Scroll into view
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);

      // Apply ring classes
      const classes = ringClass.split(' ').filter(Boolean);
      el.classList.add(...classes, 'transition-all', 'duration-300');

      // Remove after duration
      setTimeout(() => {
        el.classList.remove(...classes, 'transition-all', 'duration-300');
      }, duration);
    },
    []
  );

  /**
   * Highlight multiple elements at once.
   */
  const highlightElements = useCallback(
    (
      elements: (HTMLElement | null)[],
      ringClass = 'ring-2 ring-amber-500 ring-offset-2',
      duration = 3000
    ) => {
      const validEls = elements.filter(Boolean) as HTMLElement[];
      if (validEls.length === 0) return;

      // Scroll to first
      setTimeout(() => {
        validEls[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);

      const classes = ringClass.split(' ').filter(Boolean);
      validEls.forEach((el) => {
        el.classList.add(...classes, 'transition-all', 'duration-300');
      });

      setTimeout(() => {
        validEls.forEach((el) => {
          el.classList.remove(...classes, 'transition-all', 'duration-300');
        });
      }, duration);
    },
    []
  );

  return { alertId, highlightElement, highlightElements };
}
