import { useState, useCallback, useRef, useEffect } from "react";
import type { SelectionRange } from "../types/hex.types.ts";

export function useHexSelection(onSelectionChange?: (offset: number) => void) {
  const [selectedOffset, setSelectedOffset] = useState<number | null>(null);
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);
  const [hoveredOffset, setHoveredOffset] = useState<number | null>(null);

  const isDraggingRef = useRef(false);
  const dragAnchorRef = useRef<number | null>(null);

  // Single click selection
  const selectByte = useCallback(
    (offset: number) => {
      setSelectedOffset(offset);
      setSelectionRange({ start: offset, end: offset });
      if (onSelectionChange) {
        onSelectionChange(offset);
      }
    },
    [onSelectionChange]
  );

  // Mouse down: begin click or drag
  const handleMouseDown = useCallback(
    (offset: number) => {
      isDraggingRef.current = true;
      dragAnchorRef.current = offset;
      selectByte(offset);
    },
    [selectByte]
  );

  // Mouse enter: expand range if dragging
  const handleMouseEnter = useCallback((offset: number) => {
    setHoveredOffset(offset);
    if (isDraggingRef.current && dragAnchorRef.current !== null) {
      const start = Math.min(dragAnchorRef.current, offset);
      const end = Math.max(dragAnchorRef.current, offset);
      setSelectionRange({ start, end });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredOffset(null);
  }, []);

  // Global mouseup to release drag anywhere in window
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDraggingRef.current = false;
      dragAnchorRef.current = null;
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  return {
    selectedOffset,
    selectionRange,
    hoveredOffset,
    selectByte,
    handleMouseDown,
    handleMouseEnter,
    handleMouseLeave,
  };
}
