import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
    enableDragScroll?: boolean;
  }
>(({ className, children, enableDragScroll = true, ...props }, ref) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isDragging = React.useRef(false);
  const startY = React.useRef(0);
  const scrollTop = React.useRef(0);

  React.useEffect(() => {
    if (!enableDragScroll) return;
    
    const container = containerRef.current;
    if (!container) return;

    // Find the viewport element inside the container
    const viewport = container.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (!viewport) return;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      startY.current = e.pageY;
      scrollTop.current = viewport.scrollTop;
      viewport.style.cursor = 'grabbing';
      viewport.style.userSelect = 'none';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const deltaY = e.pageY - startY.current;
      viewport.scrollTop = scrollTop.current - deltaY;
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      viewport.style.cursor = '';
      viewport.style.userSelect = '';
    };

    const handleMouseLeave = () => {
      isDragging.current = false;
      viewport.style.cursor = '';
      viewport.style.userSelect = '';
    };

    viewport.addEventListener('mousedown', handleMouseDown);
    viewport.addEventListener('mousemove', handleMouseMove);
    viewport.addEventListener('mouseup', handleMouseUp);
    viewport.addEventListener('mouseleave', handleMouseLeave);

    // Add grab cursor
    viewport.style.cursor = 'grab';

    return () => {
      viewport.removeEventListener('mousedown', handleMouseDown);
      viewport.removeEventListener('mousemove', handleMouseMove);
      viewport.removeEventListener('mouseup', handleMouseUp);
      viewport.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [enableDragScroll]);

  return (
    <div ref={containerRef}>
      <ScrollAreaPrimitive.Root
        ref={ref}
        className={cn("relative overflow-hidden", className)}
        {...props}
      >
        <ScrollAreaPrimitive.Viewport
          className="h-full w-full rounded-[inherit] overflow-auto touch-pan-y overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {children}
        </ScrollAreaPrimitive.Viewport>
        <ScrollBar />
        <ScrollAreaPrimitive.Corner />
      </ScrollAreaPrimitive.Root>
    </div>
  );
})
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
