import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
    enableDragScroll?: boolean;
  }
>(({ className, children, enableDragScroll = true, ...props }, ref) => {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const isDragging = React.useRef(false);
  const startY = React.useRef(0);
  const scrollTop = React.useRef(0);

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    if (!enableDragScroll || !viewportRef.current) return;
    isDragging.current = true;
    startY.current = e.pageY;
    scrollTop.current = viewportRef.current.scrollTop;
    viewportRef.current.style.cursor = 'grabbing';
    viewportRef.current.style.userSelect = 'none';
  }, [enableDragScroll]);

  const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !viewportRef.current) return;
    const deltaY = e.pageY - startY.current;
    viewportRef.current.scrollTop = scrollTop.current - deltaY;
  }, []);

  const handleMouseUp = React.useCallback(() => {
    if (!viewportRef.current) return;
    isDragging.current = false;
    viewportRef.current.style.cursor = '';
    viewportRef.current.style.userSelect = '';
  }, []);

  const handleMouseLeave = React.useCallback(() => {
    if (!viewportRef.current) return;
    isDragging.current = false;
    viewportRef.current.style.cursor = '';
    viewportRef.current.style.userSelect = '';
  }, []);

  return (
    <ScrollAreaPrimitive.Root
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        className={cn(
          "h-full w-full rounded-[inherit] overflow-auto touch-pan-y overscroll-contain",
          enableDragScroll && "cursor-grab"
        )}
        style={{ WebkitOverflowScrolling: "touch" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
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
