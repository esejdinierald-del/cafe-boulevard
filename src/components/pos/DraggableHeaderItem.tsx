import { useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";

interface Props {
  id: string;
  children: React.ReactNode;
}

/**
 * Wraps a header element and lets the user drag it freely.
 * The offset (dx, dy) is persisted per-id in localStorage.
 * Long-press or click on the small grip handle to move.
 */
export const DraggableHeaderItem = ({ id, children }: Props) => {
  const key = `pos_hdr_pos_${id}`;
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { x: 0, y: 0 };
  });
  const dragging = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - dragging.current.startX;
      const dy = e.clientY - dragging.current.startY;
      setPos({ x: dragging.current.baseX + dx, y: dragging.current.baseY + dy });
    };
    const up = () => {
      if (dragging.current) {
        dragging.current = null;
        setIsDragging(false);
        try { localStorage.setItem(key, JSON.stringify(pos)); } catch {}
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [pos, key]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: pos.x,
      baseY: pos.y,
    };
    setIsDragging(true);
  };

  const reset = () => {
    setPos({ x: 0, y: 0 });
    try { localStorage.removeItem(key); } catch {}
  };

  return (
    <div
      className="relative inline-flex items-center"
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        touchAction: "none",
        zIndex: isDragging ? 50 : "auto",
        transition: isDragging ? "none" : "transform 0.15s ease",
      }}
    >
      <button
        type="button"
        onPointerDown={onPointerDown}
        onDoubleClick={reset}
        title="Tërhiq për ta lëvizur (dyklik për reset)"
        className={`mr-1 flex items-center justify-center w-4 h-4 rounded bg-slate-700/70 hover:bg-amber-500/60 text-slate-300 cursor-grab active:cursor-grabbing ${isDragging ? "ring-2 ring-amber-400" : ""}`}
        style={{ touchAction: "none" }}
      >
        <GripVertical size={10} />
      </button>
      {children}
    </div>
  );
};