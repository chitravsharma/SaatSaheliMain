import React, { useState, useRef, useCallback, useEffect } from "react";
import { useStrings } from "./LanguageContext";

const PAGE_W = 400;
const PAGE_H = 500;

// Resolve image URL (supports local uploads and Drive URLs)
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

function DraggableImage({ src, layout, onChange, label }) {
  const ref = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const startPos = useRef({ mx: 0, my: 0, x: 0, y: 0, w: 0, h: 0 });

  const onMouseDownDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    startPos.current = { mx: e.clientX, my: e.clientY, x: layout.x, y: layout.y };
  }, [layout]);

  const onMouseDownResize = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(true);
    startPos.current = { mx: e.clientX, my: e.clientY, w: layout.width, h: layout.height };
  }, [layout]);

  useEffect(() => {
    if (!dragging && !resizing) return;
    const onMove = (e) => {
      if (dragging) {
        const dx = e.clientX - startPos.current.mx;
        const dy = e.clientY - startPos.current.my;
        let nx = Math.round(startPos.current.x + dx);
        let ny = Math.round(startPos.current.y + dy);
        nx = Math.max(0, Math.min(PAGE_W - layout.width, nx));
        ny = Math.max(0, Math.min(PAGE_H - layout.height, ny));
        onChange({ ...layout, x: nx, y: ny });
      }
      if (resizing) {
        const dx = e.clientX - startPos.current.mx;
        const dy = e.clientY - startPos.current.my;
        let nw = Math.round(Math.max(40, startPos.current.w + dx));
        let nh = Math.round(Math.max(30, startPos.current.h + dy));
        nw = Math.min(PAGE_W - layout.x, nw);
        nh = Math.min(PAGE_H - layout.y, nh);
        onChange({ ...layout, width: nw, height: nh });
      }
    };
    const onUp = () => { setDragging(false); setResizing(false); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, resizing, layout, onChange]);

  return (
    <div
      ref={ref}
      className="ple-draggable"
      style={{
        position: "absolute",
        left: layout.x,
        top: layout.y,
        width: layout.width,
        height: layout.height,
        cursor: dragging ? "grabbing" : "grab",
      }}
      onMouseDown={onMouseDownDrag}
    >
      <img
        src={src}
        alt={label}
        draggable={false}
        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 4, display: "block" }}
      />
      <div className="ple-label">{label}</div>
      <div
        className="ple-resize-handle"
        onMouseDown={onMouseDownResize}
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
      <div className="ple-label-bar">{strings.pageLayoutEditor.labelBar}</div>
      <div className="ple-canvas" style={{ width: PAGE_W, height: PAGE_H }}>
        {/* Text layer */}
        <div
          className="ple-text"
          style={{
            position: "absolute",
            left: textLayout.x,
            top: textLayout.y,
            width: textLayout.width,
            ...textStyle,
            pointerEvents: "none",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {content || ""}
        </div>

        {img1Src && (
          <DraggableImage
            src={img1Src}
            layout={img1Layout}
            onChange={(l) => update("image1", l)}
            label={strings.pageLayoutEditor.image1Label}
          />
        )}
        {img2Src && (
          <DraggableImage
            src={img2Src}
            layout={img2Layout}
            onChange={(l) => update("image2", l)}
            label={strings.pageLayoutEditor.image2Label}
          />
        )}
      </div>
    </div>
  );
}
