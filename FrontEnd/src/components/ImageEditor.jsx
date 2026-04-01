import React, { useState, useRef, useEffect, useCallback } from "react";
import "./ImageEditor.css";

const SHAPES = [
  { id: "none", label: "None", icon: "▭" },
  { id: "circle", label: "Circle", icon: "●" },
  { id: "square", label: "Square", icon: "■" },
  { id: "triangle", label: "Triangle", icon: "▲" },
  { id: "hexagon", label: "Hexagon", icon: "⬡" },
  { id: "star", label: "Star", icon: "★" },
  { id: "diamond", label: "Diamond", icon: "◆" },
  { id: "heart", label: "Heart", icon: "♥" },
];

function drawShapePath(ctx, shape, cx, cy, r) {
  switch (shape) {
    case "circle":
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      break;
    case "square": {
      const s = r * 0.9;
      ctx.rect(cx - s, cy - s, s * 2, s * 2);
      break;
    }
    case "triangle": {
      const pts = [];
      for (let i = 0; i < 3; i++) {
        const angle = (i * 2 * Math.PI) / 3 - Math.PI / 2;
        pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
      }
      ctx.moveTo(pts[0][0], pts[0][1]);
      pts.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.closePath();
      break;
    }
    case "hexagon": {
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 - Math.PI / 6;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    }
    case "star": {
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.45;
        const x = cx + rad * Math.cos(angle);
        const y = cy + rad * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    }
    case "diamond": {
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.7, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r * 0.7, cy);
      ctx.closePath();
      break;
    }
    case "heart": {
      const s = r * 0.6;
      ctx.moveTo(cx, cy + s * 1.4);
      ctx.bezierCurveTo(cx - s * 2.2, cy - s * 0.2, cx - s * 1.2, cy - s * 1.8, cx, cy - s * 0.6);
      ctx.bezierCurveTo(cx + s * 1.2, cy - s * 1.8, cx + s * 2.2, cy - s * 0.2, cx, cy + s * 1.4);
      ctx.closePath();
      break;
    }
    default:
      break;
  }
}

function ImageEditor({ file, onDone, onCancel }) {
  const canvasRef = useRef(null);
  const previewRef = useRef(null);
  const [img, setImg] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [shape, setShape] = useState("none");

  // Load image from file
  useEffect(() => {
    if (!file) return;
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      setImg(image);
      URL.revokeObjectURL(url);
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Draw preview
  const drawPreview = useCallback(() => {
    if (!img || !previewRef.current) return;
    const canvas = previewRef.current;
    const ctx = canvas.getContext("2d");

    const isRotated90 = rotation % 180 !== 0;
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    const outW = isRotated90 ? srcH : srcW;
    const outH = isRotated90 ? srcW : srcH;

    // Fit preview into max 400x400
    const maxSize = 400;
    const scale = Math.min(maxSize / outW, maxSize / outH, 1);
    canvas.width = Math.round(outW * scale);
    canvas.height = Math.round(outH * scale);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw checkerboard for transparency
    const tileSize = 10;
    for (let y = 0; y < canvas.height; y += tileSize) {
      for (let x = 0; x < canvas.width; x += tileSize) {
        ctx.fillStyle = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0 ? "#e0e0e0" : "#fff";
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }

    ctx.save();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Apply shape clip
    if (shape !== "none") {
      const r = Math.min(cx, cy) * 0.95;
      ctx.beginPath();
      drawShapePath(ctx, shape, cx, cy, r);
      ctx.clip();
    }

    // Transform: translate to center, rotate, flip, draw centered
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(img, -srcW * scale / 2, -srcH * scale / 2, srcW * scale, srcH * scale);
    ctx.restore();
  }, [img, rotation, flipH, flipV, shape]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  const handleApply = useCallback(() => {
    if (!img) return;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d");

    const isRotated90 = rotation % 180 !== 0;
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    const outW = isRotated90 ? srcH : srcW;
    const outH = isRotated90 ? srcW : srcH;

    canvas.width = outW;
    canvas.height = outH;
    ctx.clearRect(0, 0, outW, outH);

    const cx = outW / 2;
    const cy = outH / 2;

    ctx.save();
    if (shape !== "none") {
      const r = Math.min(cx, cy) * 0.95;
      ctx.beginPath();
      drawShapePath(ctx, shape, cx, cy, r);
      ctx.clip();
    }

    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(img, -srcW / 2, -srcH / 2, srcW, srcH);
    ctx.restore();

    canvas.toBlob((blob) => {
      if (blob) {
        const editedFile = new File([blob], file.name.replace(/\.\w+$/, ".png"), { type: "image/png" });
        onDone(editedFile);
      }
    }, "image/png");
  }, [img, rotation, flipH, flipV, shape, file, onDone]);

  const handleReset = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setShape("none");
  };

  if (!file) return null;

  return (
    <div className="img-editor-overlay" onClick={onCancel}>
      <div className="img-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="img-editor-header">
          <h3>Edit Image</h3>
          <button className="img-editor-close" onClick={onCancel}>&times;</button>
        </div>

        <div className="img-editor-preview">
          {img ? (
            <canvas ref={previewRef} className="img-editor-canvas" />
          ) : (
            <div className="img-editor-loading">Loading...</div>
          )}
        </div>

        <div className="img-editor-controls">
          {/* Flip */}
          <div className="img-editor-group">
            <span className="img-editor-group-label">Flip</span>
            <button className={`img-editor-btn ${flipH ? "active" : ""}`} onClick={() => setFlipH(!flipH)} title="Flip Horizontal">
              ↔ H
            </button>
            <button className={`img-editor-btn ${flipV ? "active" : ""}`} onClick={() => setFlipV(!flipV)} title="Flip Vertical">
              ↕ V
            </button>
          </div>

          {/* Rotate */}
          <div className="img-editor-group">
            <span className="img-editor-group-label">Rotate</span>
            <button className="img-editor-btn" onClick={() => setRotation((r) => (r - 90 + 360) % 360)} title="Rotate Left">
              ↺ 90
            </button>
            <button className="img-editor-btn" onClick={() => setRotation((r) => (r + 90) % 360)} title="Rotate Right">
              ↻ 90
            </button>
            <button className="img-editor-btn" onClick={() => setRotation((r) => (r + 180) % 360)} title="Rotate 180">
              ↻ 180
            </button>
          </div>

          {/* Free rotation */}
          <div className="img-editor-group img-editor-group-wide">
            <span className="img-editor-group-label">Angle: {rotation}°</span>
            <input
              type="range"
              min="0"
              max="359"
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="img-editor-slider"
            />
          </div>

          {/* Shapes */}
          <div className="img-editor-group img-editor-group-wide">
            <span className="img-editor-group-label">Shape</span>
            <div className="img-editor-shapes">
              {SHAPES.map((s) => (
                <button
                  key={s.id}
                  className={`img-editor-shape-btn ${shape === s.id ? "active" : ""}`}
                  onClick={() => setShape(s.id)}
                  title={s.label}
                >
                  {s.icon}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="img-editor-actions">
          <button className="img-editor-btn img-editor-btn-reset" onClick={handleReset}>Reset</button>
          <button className="img-editor-btn img-editor-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="img-editor-btn img-editor-btn-apply" onClick={handleApply}>Apply</button>
        </div>
      </div>
    </div>
  );
}

export default ImageEditor;
