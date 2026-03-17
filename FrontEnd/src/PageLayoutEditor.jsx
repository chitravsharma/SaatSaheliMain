import React, { useState, useRef, useCallback, useEffect } from "react";
import { useStrings } from "./LanguageContext";

const PAGE_W = 400;
const PAGE_H = 500;

function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("/uploads/")) {
    return `${process.env.REACT_APP_API_URL}${url}`;
  }
  const match = url.match(/\/file\/d\/([^/]+)\//);
  if (match) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
  }
  return url;
}

const defaultLayout = (key) => ({
  x: key === "image1" ? 10 : 210,
  y: 60,
  width: 160,
  height: 120,
});

function getClientXY(e) {
  if (e.touches && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

function DraggableItem({ children, layout, onChange, label, type }) {
  const ref = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const startPos = useRef({ mx: 0, my: 0, x: 0, y: 0, w: 0, h: 0 });

  const onStartDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = getClientXY(e);
    setDragging(true);
    startPos.current = { mx: pos.x, my: pos.y, x: layout.x, y: layout.y };
  }, [layout]);

  const onStartResize = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = getClientXY(e);
    setResizing(true);
    startPos.current = { mx: pos.x, my: pos.y, w: layout.width, h: layout.height, x: layout.x, y: layout.y };
  }, [layout]);

  useEffect(() => {
    if (!dragging && !resizing) return;

    const onMove = (e) => {
      const pos = getClientXY(e);
      if (dragging) {
        const dx = pos.x - startPos.current.mx;
        const dy = pos.y - startPos.current.my;
        let nx = Math.round(startPos.current.x + dx);
        let ny = Math.round(startPos.current.y + dy);
        nx = Math.max(0, Math.min(PAGE_W - layout.width, nx));
        ny = Math.max(0, Math.min(PAGE_H - layout.height, ny));
        onChange({ ...layout, x: nx, y: ny });
      }
      if (resizing) {
        const dx = pos.x - startPos.current.mx;
        const dy = pos.y - startPos.current.my;
        let nw = Math.round(Math.max(40, startPos.current.w + dx));
        let nh = Math.round(Math.max(30, startPos.current.h + dy));
        nw = Math.min(PAGE_W - layout.x, nw);
        nh = Math.min(PAGE_H - layout.y, nh);
        onChange({ ...layout, width: nw, height: nh });
      }
    };
    const onEnd = () => { setDragging(false); setResizing(false); };

    // Mouse events
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    // Touch events
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [dragging, resizing, layout, onChange]);

  const isActive = dragging || resizing;

  return (
    <div
      ref={ref}
      className={`ple-draggable ${isActive ? "ple-active" : ""} ple-type-${type}`}
      style={{
        position: "absolute",
        left: layout.x,
        top: layout.y,
        width: layout.width,
        height: layout.height,
        cursor: dragging ? "grabbing" : "grab",
        zIndex: isActive ? 10 : 1,
      }}
      onMouseDown={onStartDrag}
      onTouchStart={onStartDrag}
    >
      {children}
      <div className="ple-label">{label}</div>
      {isActive && (
        <div className="ple-dimensions">{layout.width} x {layout.height}</div>
      )}
      <div
        className="ple-resize-handle"
        onMouseDown={onStartResize}
        onTouchStart={onStartResize}
      />
    </div>
  );
}

export default function PageLayoutEditor({ imageUrl, imageUrl2, content, textStyle, layout, onLayoutChange }) {
  const strings = useStrings();
  const img1Src = resolveImageUrl(imageUrl);
  const img2Src = resolveImageUrl(imageUrl2);

  const img1Layout = layout?.image1 || defaultLayout("image1");
  const img2Layout = layout?.image2 || defaultLayout("image2");
  const textLayout = layout?.text || { x: 10, y: 10, width: PAGE_W - 20, height: 40 };

  const update = (key, val) => {
    onLayoutChange({ ...layout, [key]: val });
  };

  return (
    <div className="ple-container">
      <div className="ple-label-bar">
        {strings.pageLayoutEditor.labelBar}
        <span className="ple-hint"> — Drag to move, corner handle to resize</span>
      </div>
      <div className="ple-canvas" style={{ width: PAGE_W, height: PAGE_H }}>
        {/* Text layer — now draggable */}
        {content && (
          <DraggableItem
            layout={textLayout}
            onChange={(l) => update("text", l)}
            label="Text"
            type="text"
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                ...textStyle,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                overflow: "hidden",
                fontSize: textStyle?.fontSize || "14px",
                lineHeight: 1.4,
                pointerEvents: "none",
              }}
            >
              {content}
            </div>
          </DraggableItem>
        )}

        {img1Src && (
          <DraggableItem
            layout={img1Layout}
            onChange={(l) => update("image1", l)}
            label={strings.pageLayoutEditor.image1Label}
            type="image"
          >
            <img
              src={img1Src}
              alt={strings.pageLayoutEditor.image1Label}
              draggable={false}
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 4, display: "block" }}
            />
          </DraggableItem>
        )}

        {img2Src && (
          <DraggableItem
            layout={img2Layout}
            onChange={(l) => update("image2", l)}
            label={strings.pageLayoutEditor.image2Label}
            type="image"
          >
            <img
              src={img2Src}
              alt={strings.pageLayoutEditor.image2Label}
              draggable={false}
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 4, display: "block" }}
            />
          </DraggableItem>
        )}
      </div>
    </div>
  );
}
