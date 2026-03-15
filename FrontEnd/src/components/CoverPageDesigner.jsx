import React, { useState, useRef, useCallback } from "react";
import axios from "axios";
import "./CoverPageDesigner.css";

const GENERATE_API = `${process.env.REACT_APP_API_URL}/api/generate-image`;
const UPLOAD_API = `${process.env.REACT_APP_API_URL}/api/upload`;

const GENRES = [
  "Fiction", "Romance", "Thriller", "Fantasy", "Children's Book",
  "Poetry", "Self Help", "Mystery", "Sci-Fi", "Non-Fiction",
  "Biography", "History", "Cooking", "Art", "Travel",
];

const AUDIENCES = ["All", "Kids", "Young Adult", "Adults"];

const COVER_STYLES = [
  "Minimalist", "Dark", "Bright", "Magical", "Vintage", "Cute", "Professional",
];

const ILLUSTRATION_STYLES = [
  "Realistic", "Cartoon", "Watercolor", "Oil Painting",
  "Flat Illustration", "3D Art", "Anime", "Pencil Sketch",
];

const COLOR_THEMES = [
  "Warm colors", "Dark theme", "Pastel", "Bright", "Black & Gold",
  "Blue & White", "Earth tones", "Monochrome",
];

const BACKGROUND_TYPES = [
  "Nature", "City", "Abstract", "Space", "Fantasy landscape",
  "Library", "Ocean", "Mountains",
];

const TITLE_FONT_STYLES = [
  "Elegant", "Bold", "Handwritten", "Classic serif", "Modern sans serif",
];

const TEXT_ALIGNMENTS = ["Center", "Top", "Bottom"];

const COVER_SIZES = [
  { label: "Standard (6x9 in)", value: "6x9" },
  { label: "Amazon Kindle (2560x1600)", value: "kindle" },
  { label: "Square (1:1)", value: "square" },
  { label: "A5 (5.8x8.3 in)", value: "a5" },
];

// Canvas dimensions for the composite cover image
const CANVAS_W = 600;
const CANVAS_H = 900;

function CoverPageDesigner({ type, bookTitle, authorName, imageUrl, onImageChange, onDesignDataChange, initialData }) {
  const isCover = type === "cover";
  const [data, setData] = useState(initialData || {});
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [expandedSections, setExpandedSections] = useState({ book: true, visual: false, typography: false, publishing: false, ai: false });
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [imageScale, setImageScale] = useState(initialData?.imageScale || 100);
  const [authorPhotoUrl, setAuthorPhotoUrl] = useState(initialData?.authorPhotoUrl || "");
  const [uploadingAuthorPhoto, setUploadingAuthorPhoto] = useState(false);
  const [savedComposite, setSavedComposite] = useState(false); // true after saving composite image
  const [bgImageUrl, setBgImageUrl] = useState(""); // original background image before composite
  const customizerRef = useRef(null);
  const canvasRef = useRef(null);

  // Draggable text position state (percentage-based for responsiveness)
  const [textPos, setTextPos] = useState(initialData?.textPos || { x: 50, y: isCover ? 30 : 10 });
  const [authorPos, setAuthorPos] = useState(initialData?.authorPos || { x: 50, y: 90 });
  const dragRef = useRef(null);
  const previewRef = useRef(null);

  const update = (key, value) => {
    const updated = { ...data, [key]: value };
    setData(updated);
    if (onDesignDataChange) onDesignDataChange(updated);
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const buildAIPrompt = () => {
    const parts = [];
    if (data.scene) parts.push(data.scene);
    if (data.customPrompt) parts.push(data.customPrompt);
    return parts.join(", ") || (isCover ? "Book cover design" : "Book back cover design");
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setMessage("");
    try {
      const prompt = buildAIPrompt();
      const res = await axios.post(GENERATE_API, { prompt, style: "general" }, { timeout: 90000 });
      if (onImageChange) onImageChange(res.data.url);
      setMessage("Cover image generated!");
    } catch (err) {
      setMessage(`Generation failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(UPLOAD_API, formData, { headers: { "Content-Type": "multipart/form-data" } });
      if (onImageChange) onImageChange(res.data.url);
      setMessage("Image uploaded!");
    } catch (err) {
      setMessage(`Upload failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleAuthorPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAuthorPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(UPLOAD_API, formData, { headers: { "Content-Type": "multipart/form-data" } });
      setAuthorPhotoUrl(res.data.url);
      update("authorPhotoUrl", res.data.url);
    } catch {
      setMessage("Author photo upload failed");
    } finally {
      setUploadingAuthorPhoto(false);
    }
  };

  const handleSaveAndCustomize = () => {
    const updated = { ...data, imageScale, authorPhotoUrl, textPos, authorPos };
    setData(updated);
    if (onDesignDataChange) onDesignDataChange(updated);
    setBgImageUrl(imageUrl); // save original background before any composite
    setSavedComposite(false); // reset saved state when entering customizer
    setShowCustomizer(true);
    setTimeout(() => customizerRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const resolveUrl = (url) => {
    if (!url) return url;
    if (url.startsWith("/uploads/")) return `${process.env.REACT_APP_API_URL}${url}`;
    const match = url.match(/\/file\/d\/([^/]+)\//);
    if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
    return url;
  };

  // Get canvas-compatible font family
  const getCanvasFont = useCallback(() => {
    const map = {
      "Elegant": "Georgia, serif",
      "Bold": "Arial Black, sans-serif",
      "Handwritten": "Brush Script MT, cursive",
      "Classic serif": "Times New Roman, serif",
      "Modern sans serif": "Helvetica Neue, sans-serif",
    };
    return map[data.titleFontStyle] || "Georgia, serif";
  }, [data.titleFontStyle]);

  // Load an image as a promise
  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image: " + src));
      img.src = src;
    });
  };

  // Word-wrap text for canvas
  const wrapText = (ctx, text, maxWidth) => {
    const words = text.split(" ");
    const lines = [];
    let currentLine = "";
    for (const word of words) {
      const testLine = currentLine ? currentLine + " " + word : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // Render the cover/back page onto a canvas and upload as image
  const handleSaveCoverAsImage = async () => {
    const sourceImage = bgImageUrl || imageUrl; // use original bg, not a previously saved composite
    if (!sourceImage) return;
    setSaving(true);
    setMessage("");

    try {
      const canvas = canvasRef.current || document.createElement("canvas");
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext("2d");

      // Load and draw background image
      const resolvedUrl = resolveUrl(sourceImage);
      const bgImg = await loadImage(resolvedUrl);

      // Draw image scaled to cover the canvas
      const scale = (imageScale || 100) / 100;
      const imgW = CANVAS_W * scale;
      const imgH = CANVAS_H * scale;
      const offsetX = (CANVAS_W - imgW) / 2;
      const offsetY = (CANVAS_H - imgH) / 2;
      ctx.drawImage(bgImg, offsetX, offsetY, imgW, imgH);

      const fontFamily = getCanvasFont();
      const titleText = data.title || bookTitle || "";
      const subtitleText = data.subtitle || "";
      const authorText = data.author || authorName || "";
      const taglineText = data.tagline || "";
      const seriesText = data.series || "";
      const alignment = (data.textAlignment || "Center").toLowerCase();

      // Draw text shadow helper
      const drawTextWithShadow = (text, x, y, fontSize, bold) => {
        ctx.font = `${bold ? "bold " : ""}${fontSize}px ${fontFamily}`;
        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillText(text, x + 2, y + 2);
        // Main text
        ctx.fillStyle = "#ffffff";
        ctx.fillText(text, x, y);
      };

      if (isCover) {
        // --- FRONT COVER LAYOUT ---
        ctx.textAlign = "center";
        // Use draggable text position (percentage to pixel)
        const centerX = (textPos.x / 100) * CANVAS_W;
        const startY = (textPos.y / 100) * CANVAS_H;

        let currentY = startY;

        // Series
        if (seriesText) {
          drawTextWithShadow(seriesText, centerX, currentY, 18, false);
          currentY += 35;
        }

        // Title
        if (titleText) {
          const titleLines = wrapText(
            (() => { ctx.font = `bold 42px ${fontFamily}`; return ctx; })(),
            titleText,
            CANVAS_W - 80
          );
          for (const line of titleLines) {
            drawTextWithShadow(line, centerX, currentY, 42, true);
            currentY += 52;
          }
          currentY += 10;
        }

        // Subtitle
        if (subtitleText) {
          const subLines = wrapText(
            (() => { ctx.font = `24px ${fontFamily}`; return ctx; })(),
            subtitleText,
            CANVAS_W - 80
          );
          for (const line of subLines) {
            drawTextWithShadow(line, centerX, currentY, 24, false);
            currentY += 32;
          }
          currentY += 10;
        }

        // Tagline
        if (taglineText) {
          const tagLines = wrapText(
            (() => { ctx.font = `italic 20px ${fontFamily}`; return ctx; })(),
            taglineText,
            CANVAS_W - 80
          );
          ctx.font = `italic 20px ${fontFamily}`;
          for (const line of tagLines) {
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillText(line, centerX + 2, currentY + 2);
            ctx.fillStyle = "#ffffff";
            ctx.fillText(line, centerX, currentY);
            currentY += 28;
          }
        }

        // Author name at draggable position
        if (authorText) {
          const authorFontSize = data.authorNameSize === "Large" ? 28 : data.authorNameSize === "Small" ? 18 : 22;
          const authorX = (authorPos.x / 100) * CANVAS_W;
          const authorY = (authorPos.y / 100) * CANVAS_H;
          drawTextWithShadow(authorText, authorX, authorY, authorFontSize, true);
        }
      } else {
        // --- BACK COVER LAYOUT ---
        ctx.textAlign = "center";
        const centerX = (textPos.x / 100) * CANVAS_W;
        const blurbText = data.blurb || "";
        const authorBioText = data.authorBio || "";
        const isbnText = data.isbn || "";
        const publisherText = data.publisher || "";
        const priceText = data.price || "";

        let currentY = (textPos.y / 100) * CANVAS_H;

        // Title
        if (titleText) {
          drawTextWithShadow(titleText, centerX, currentY, 30, true);
          currentY += 50;
        }

        // Blurb
        if (blurbText) {
          ctx.textAlign = "left";
          const blurbLines = wrapText(
            (() => { ctx.font = `18px ${fontFamily}`; return ctx; })(),
            blurbText,
            CANVAS_W - 100
          );
          for (const line of blurbLines) {
            drawTextWithShadow(line, 50, currentY, 18, false);
            currentY += 26;
          }
          currentY += 20;
          ctx.textAlign = "center";
        }

        // Author bio
        if (authorBioText) {
          // Draw author photo if available
          if (authorPhotoUrl) {
            try {
              const photoImg = await loadImage(resolveUrl(authorPhotoUrl));
              const photoSize = 70;
              const photoX = centerX - photoSize / 2;
              // Draw circular photo
              ctx.save();
              ctx.beginPath();
              ctx.arc(photoX + photoSize / 2, currentY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
              ctx.clip();
              ctx.drawImage(photoImg, photoX, currentY, photoSize, photoSize);
              ctx.restore();
              // White border
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(photoX + photoSize / 2, currentY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
              ctx.stroke();
              currentY += photoSize + 15;
            } catch {
              // skip photo if load fails
            }
          }

          ctx.textAlign = "left";
          const bioLines = wrapText(
            (() => { ctx.font = `italic 16px ${fontFamily}`; return ctx; })(),
            authorBioText,
            CANVAS_W - 100
          );
          ctx.font = `italic 16px ${fontFamily}`;
          for (const line of bioLines) {
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillText(line, 52, currentY + 2);
            ctx.fillStyle = "#ffffff";
            ctx.fillText(line, 50, currentY);
            currentY += 24;
          }
          currentY += 15;
          ctx.textAlign = "center";
        }

        // Tagline
        if (taglineText) {
          ctx.font = `italic 18px ${fontFamily}`;
          ctx.fillStyle = "rgba(0,0,0,0.7)";
          ctx.fillText(taglineText, centerX + 2, currentY + 2);
          ctx.fillStyle = "#ffffff";
          ctx.fillText(taglineText, centerX, currentY);
          currentY += 30;
        }

        // Author name
        if (authorText) {
          const authorFontSize = data.authorNameSize === "Large" ? 24 : data.authorNameSize === "Small" ? 16 : 20;
          drawTextWithShadow(authorText, centerX, currentY, authorFontSize, true);
        }

        // Bottom row: publisher, ISBN, price
        const bottomY = CANVAS_H - 40;
        ctx.textAlign = "center";
        const bottomParts = [];
        if (publisherText) bottomParts.push(publisherText);
        if (isbnText) bottomParts.push("ISBN: " + isbnText);
        if (priceText) bottomParts.push(priceText);
        if (bottomParts.length > 0) {
          drawTextWithShadow(bottomParts.join("  |  "), centerX, bottomY, 14, false);
        }
      }

      // Convert canvas to blob and upload
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      const formData = new FormData();
      formData.append("file", blob, `${isCover ? "cover" : "backpage"}-${Date.now()}.png`);
      const res = await axios.post(UPLOAD_API, formData, { headers: { "Content-Type": "multipart/form-data" } });

      // Save the composite image as the page image
      if (onImageChange) onImageChange(res.data.url);

      // Save design data with positions
      const updated = { ...data, imageScale, authorPhotoUrl, textPos, authorPos, savedAsImage: true };
      setData(updated);
      if (onDesignDataChange) onDesignDataChange(updated);
      setSavedComposite(true); // mark as saved to hide text overlay in preview

      setMessage(`${isCover ? "Cover" : "Back"} page saved as image!`);
    } catch (err) {
      console.error("Save cover as image failed:", err);
      setMessage(`Save failed: ${err.message}. If the image is from an external source, try uploading your own image first.`);
    } finally {
      setSaving(false);
    }
  };

  const renderSelect = (label, key, options, placeholder) => (
    <div className="cpd-field">
      <label className="cpd-label">{label}</label>
      <select value={data[key] || ""} onChange={(e) => update(key, e.target.value)} className="cpd-select">
        <option value="">{placeholder || `Select ${label}...`}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );

  const renderInput = (label, key, placeholder, multiline) => (
    <div className="cpd-field">
      <label className="cpd-label">{label}</label>
      {multiline ? (
        <textarea value={data[key] || ""} onChange={(e) => update(key, e.target.value)}
          className="cpd-textarea" placeholder={placeholder} rows={3} />
      ) : (
        <input type="text" value={data[key] || ""} onChange={(e) => update(key, e.target.value)}
          className="cpd-input" placeholder={placeholder} />
      )}
    </div>
  );

  const renderSection = (id, title, icon, content) => (
    <div className="cpd-section">
      <button className="cpd-section-header" onClick={() => toggleSection(id)} type="button">
        <span className="cpd-section-icon">{icon}</span>
        <span className="cpd-section-title">{title}</span>
        <span className={`cpd-chevron ${expandedSections[id] ? "cpd-chevron-open" : ""}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </span>
      </button>
      {expandedSections[id] && <div className="cpd-section-body">{content}</div>}
    </div>
  );

  // Get font family based on titleFontStyle (for CSS preview)
  const getFontFamily = () => {
    const map = {
      "Elegant": "'Georgia', serif",
      "Bold": "'Arial Black', sans-serif",
      "Handwritten": "'Brush Script MT', cursive",
      "Classic serif": "'Times New Roman', serif",
      "Modern sans serif": "'Helvetica Neue', sans-serif",
    };
    return map[data.titleFontStyle] || "'Georgia', serif";
  };

  // Drag handlers for text positioning
  const handleDragStart = (e, target) => {
    e.preventDefault();
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragRef.current = {
      target,
      startX: clientX,
      startY: clientY,
      startPos: target === "author" ? { ...authorPos } : { ...textPos },
      rect,
    };

    const handleMove = (ev) => {
      if (!dragRef.current) return;
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const dx = ((cx - dragRef.current.startX) / dragRef.current.rect.width) * 100;
      const dy = ((cy - dragRef.current.startY) / dragRef.current.rect.height) * 100;
      const newX = Math.max(5, Math.min(95, dragRef.current.startPos.x + dx));
      const newY = Math.max(5, Math.min(95, dragRef.current.startPos.y + dy));
      if (dragRef.current.target === "author") {
        setAuthorPos({ x: newX, y: newY });
      } else {
        setTextPos({ x: newX, y: newY });
      }
    };
    const handleEnd = () => {
      dragRef.current = null;
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleMove, { passive: false });
    document.addEventListener("touchend", handleEnd);
  };

  // Render the visual customizer preview
  const renderCustomizer = () => {
    if (!imageUrl) return null;

    const titleText = data.title || bookTitle || "Book Title";
    const subtitleText = data.subtitle || "";
    const authorText = data.author || authorName || "Author Name";
    const taglineText = data.tagline || "";
    const seriesText = data.series || "";
    const fontFamily = getFontFamily();
    const authorSize = data.authorNameSize === "Large" ? "1.1rem" : data.authorNameSize === "Small" ? "0.7rem" : "0.85rem";

    // Back page fields
    const blurbText = data.blurb || "";
    const authorBioText = data.authorBio || "";
    const isbnText = data.isbn || "";
    const publisherText = data.publisher || "";
    const priceText = data.price || "";

    // Use original background image for preview (not the composite)
    const previewImageUrl = bgImageUrl || imageUrl;

    return (
      <div className="cpd-customizer" ref={customizerRef}>
        <h3 className="cpd-heading">
          {savedComposite ? `${isCover ? "Cover" : "Back"} Page Saved!` : `Customize ${isCover ? "Cover" : "Back"} Page`}
        </h3>

        {savedComposite ? (
          <>
            <p className="cpd-hint">Your {isCover ? "cover" : "back"} page has been saved as an image. Here is the final result:</p>
            {/* Show saved composite without text overlay */}
            <div className="cpd-visual-preview">
              <div className="cpd-cover-canvas">
                <img
                  src={resolveUrl(imageUrl)}
                  alt={`Saved ${isCover ? "cover" : "back"} page`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            </div>
            <button
              type="button"
              className="cpd-btn cpd-btn-customize"
              onClick={() => {
                setSavedComposite(false);
                // Restore the original background for re-editing
                if (bgImageUrl) onImageChange(bgImageUrl);
              }}
              style={{ marginTop: "12px", width: "100%" }}
            >
              Edit Again
            </button>
            <button
              type="button"
              className="cpd-btn cpd-btn-generate"
              onClick={() => setShowCustomizer(false)}
              style={{ marginTop: "8px" }}
            >
              Back to Design Form
            </button>
            {message && <p className="cpd-message">{message}</p>}
          </>
        ) : (
          <>
            <p className="cpd-hint">
              Drag the text blocks to position them. Adjust image size, then click "Save as {isCover ? "Cover" : "Back"} Page Image" to save.
            </p>

            {/* Image Scale Control */}
            <div className="cpd-scale-control">
              <label className="cpd-label">Image Size: {imageScale}%</label>
              <input
                type="range"
                min="50"
                max="150"
                value={imageScale}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setImageScale(val);
                  update("imageScale", val);
                }}
                className="cpd-range"
              />
              <div className="cpd-scale-buttons">
                <button type="button" className="cpd-scale-btn" onClick={() => { setImageScale(100); update("imageScale", 100); }}>
                  Fit Page
                </button>
                <button type="button" className="cpd-scale-btn" onClick={() => { setImageScale(150); update("imageScale", 150); }}>
                  Full Page
                </button>
              </div>
            </div>

            {/* Visual Preview with Draggable Text */}
            <div className="cpd-visual-preview">
              <div
                className="cpd-cover-canvas"
                ref={previewRef}
                style={{ overflow: "hidden", cursor: "default" }}
              >
                <img
                  src={resolveUrl(previewImageUrl)}
                  alt={isCover ? "Cover" : "Back page"}
                  className="cpd-canvas-img"
                  style={{
                    width: `${imageScale}%`,
                    height: `${imageScale}%`,
                    objectFit: "cover",
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                />

                {/* Draggable Title/Content Block */}
                <div
                  className="cpd-draggable-text"
                  style={{
                    position: "absolute",
                    left: `${textPos.x}%`,
                    top: `${textPos.y}%`,
                    transform: "translate(-50%, 0)",
                    zIndex: 3,
                    cursor: "grab",
                    textAlign: "center",
                    maxWidth: "85%",
                    pointerEvents: "auto",
                  }}
                  onMouseDown={(e) => handleDragStart(e, "title")}
                  onTouchStart={(e) => handleDragStart(e, "title")}
                >
                  <div className="cpd-drag-hint">Drag to move</div>
                  {isCover ? (
                    <>
                      {seriesText && <span className="cpd-overlay-series" style={{ fontFamily }}>{seriesText}</span>}
                      <span className="cpd-overlay-title" style={{ fontFamily, display: "block" }}>{titleText}</span>
                      {subtitleText && <span className="cpd-overlay-subtitle" style={{ fontFamily, display: "block" }}>{subtitleText}</span>}
                      {taglineText && <span className="cpd-overlay-tagline" style={{ fontFamily, display: "block" }}>{taglineText}</span>}
                    </>
                  ) : (
                    <>
                      <span className="cpd-overlay-back-title" style={{ fontFamily, display: "block" }}>{titleText}</span>
                      {blurbText && <p className="cpd-overlay-blurb" style={{ textAlign: "left" }}>{blurbText}</p>}
                      {authorBioText && (
                        <div className="cpd-overlay-bio-section">
                          {authorPhotoUrl && <img src={resolveUrl(authorPhotoUrl)} alt="Author" className="cpd-overlay-author-photo" />}
                          <p className="cpd-overlay-bio">{authorBioText}</p>
                        </div>
                      )}
                      {taglineText && <span className="cpd-overlay-tagline" style={{ display: "block" }}>{taglineText}</span>}
                      <div className="cpd-overlay-bottom-row">
                        {publisherText && <span className="cpd-overlay-publisher">{publisherText}</span>}
                        {isbnText && <span className="cpd-overlay-isbn">ISBN: {isbnText}</span>}
                        {priceText && <span className="cpd-overlay-price">{priceText}</span>}
                      </div>
                    </>
                  )}
                </div>

                {/* Draggable Author Name Block */}
                <div
                  className="cpd-draggable-text"
                  style={{
                    position: "absolute",
                    left: `${authorPos.x}%`,
                    top: `${authorPos.y}%`,
                    transform: "translate(-50%, 0)",
                    zIndex: 3,
                    cursor: "grab",
                    textAlign: "center",
                    pointerEvents: "auto",
                  }}
                  onMouseDown={(e) => handleDragStart(e, "author")}
                  onTouchStart={(e) => handleDragStart(e, "author")}
                >
                  <div className="cpd-drag-hint">Drag</div>
                  <span className="cpd-overlay-author" style={{ fontFamily, fontSize: authorSize }}>
                    {authorText}
                  </span>
                </div>
              </div>
            </div>

            {/* Hidden canvas for compositing */}
            <canvas ref={canvasRef} style={{ display: "none" }} />

            {/* Save as Image button */}
            <button
              type="button"
              className="cpd-btn cpd-btn-customize"
              onClick={handleSaveCoverAsImage}
              disabled={saving}
              style={{ marginTop: "12px", width: "100%", background: saving ? "#555" : "" }}
            >
              {saving ? "Saving..." : `Save as ${isCover ? "Cover" : "Back"} Page Image`}
            </button>

            <button
              type="button"
              className="cpd-btn cpd-btn-generate"
              onClick={() => setShowCustomizer(false)}
              style={{ marginTop: "8px" }}
            >
              Back to Design Form
            </button>

            {message && <p className="cpd-message">{message}</p>}
          </>
        )}
      </div>
    );
  };

  if (showCustomizer && imageUrl) {
    return (
      <div className="cpd-container">
        {renderCustomizer()}
      </div>
    );
  }

  return (
    <div className="cpd-container">
      <h3 className="cpd-heading">
        {isCover ? "Design Cover Page" : "Design Back Page"}
      </h3>
      <p className="cpd-hint">All fields are optional. The AI image is generated from the Scene and Custom Prompt only. Other fields (title, author, style, etc.) are saved as page data for you to adjust and align on the final {isCover ? "cover" : "back page"}.</p>

      {/* Book Information */}
      {renderSection("book", "Book Information", "\uD83D\uDCD6", (
        <>
          {renderInput("Book Title", "title", bookTitle || "Enter book title...", false)}
          {isCover && renderInput("Subtitle", "subtitle", "e.g., A Journey Through the Himalayas", false)}
          {renderInput("Author Name", "author", authorName || "Enter author name...", false)}
          {isCover && renderSelect("Genre / Category", "genre", GENRES)}
          {isCover && renderSelect("Target Audience", "audience", AUDIENCES)}
        </>
      ))}

      {/* Visual Style */}
      {renderSection("visual", "Visual Style", "\uD83C\uDFA8", (
        <>
          {renderSelect("Cover Style / Mood", "coverStyle", COVER_STYLES)}
          {renderSelect("Illustration Style", "illustrationStyle", ILLUSTRATION_STYLES)}
          {renderSelect("Color Theme", "colorTheme", COLOR_THEMES)}
          {renderInput("Main Scene / Concept", "scene", isCover ? "e.g., A girl reading under a magical tree" : "e.g., Elegant pattern with author photo space", false)}
          {renderSelect("Background Type", "backgroundType", BACKGROUND_TYPES)}
        </>
      ))}

      {/* Typography */}
      {isCover && renderSection("typography", "Typography", "\u2712\uFE0F", (
        <>
          {renderSelect("Title Font Style", "titleFontStyle", TITLE_FONT_STYLES)}
          {renderSelect("Author Name Size", "authorNameSize", ["Small", "Medium", "Large"])}
          {renderSelect("Text Alignment", "textAlignment", TEXT_ALIGNMENTS)}
        </>
      ))}

      {/* Publishing Details */}
      {renderSection("publishing", isCover ? "Publishing Details" : "Back Page Content", "\uD83D\uDCDD", isCover ? (
        <>
          {renderInput("Publisher Name", "publisher", "e.g., Penguin Books", false)}
          {renderInput("Series / Volume", "series", "e.g., Mystery Files \u2013 Book 1", false)}
          {renderInput("Tagline", "tagline", "e.g., A story that will change your life", false)}
          {renderSelect("Cover Size", "coverSize", COVER_SIZES.map((s) => s.label))}
        </>
      ) : (
        <>
          {renderInput("Back Cover Blurb", "blurb", "Write a brief description of the book...", true)}
          {renderInput("Author Bio", "authorBio", "Brief author biography...", true)}
          {renderInput("Tagline", "tagline", "e.g., A story that will change your life", false)}
          {renderInput("ISBN", "isbn", "e.g., 978-3-16-148410-0", false)}
          {renderInput("Publisher Name", "publisher", "e.g., Penguin Books", false)}
          {renderInput("Price", "price", "e.g., $14.99", false)}
          <div className="cpd-field">
            <label className="cpd-label">Author Photo</label>
            {authorPhotoUrl ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <img src={resolveUrl(authorPhotoUrl)} alt="Author" style={{ width: "60px", height: "60px", borderRadius: "50%", objectFit: "cover", border: "2px solid #2a4a6b" }} />
                <button type="button" className="cpd-remove-btn" onClick={() => { setAuthorPhotoUrl(""); update("authorPhotoUrl", ""); }}>Remove</button>
              </div>
            ) : (
              <div>
                <input type="file" accept="image/*" id="author-photo-upload" style={{ display: "none" }} onChange={handleAuthorPhotoUpload} />
                <label htmlFor="author-photo-upload" className="cpd-btn cpd-btn-upload" style={{ fontSize: "0.8rem", padding: "6px 14px", cursor: "pointer" }}>
                  {uploadingAuthorPhoto ? "Uploading..." : "Upload Author Photo"}
                </label>
              </div>
            )}
          </div>
        </>
      ))}

      {/* AI Prompt */}
      {renderSection("ai", "Custom AI Prompt", "\u2728", (
        <>
          {renderInput("Custom AI Prompt", "customPrompt",
            isCover
              ? "e.g., Fantasy book cover, magical forest, glowing tree, dreamy atmosphere, watercolor"
              : "e.g., Elegant back cover, cream background, decorative border, space for text",
            true
          )}
          <div className="cpd-prompt-preview">
            <label className="cpd-label">Generated Prompt Preview:</label>
            <p className="cpd-prompt-text">
              {[data.scene, data.customPrompt].filter(Boolean).join(", ") || "Enter a scene or custom prompt above..."}
            </p>
          </div>
        </>
      ))}

      {/* Preview & Actions */}
      <div className="cpd-actions">
        {imageUrl && (
          <div className="cpd-preview">
            <img src={resolveUrl(imageUrl)} alt={isCover ? "Cover preview" : "Back page preview"} className="cpd-preview-img" />
            <button className="cpd-remove-btn" onClick={() => onImageChange && onImageChange("")} type="button">Remove Image</button>
          </div>
        )}

        <div className="cpd-btn-row">
          <button
            className="cpd-btn cpd-btn-generate"
            onClick={handleGenerate}
            disabled={generating || uploading}
            type="button"
          >
            {generating ? "Generating..." : `Generate ${isCover ? "Cover" : "Back Page"} with AI`}
          </button>

          <label className="cpd-btn cpd-btn-upload">
            {uploading ? "Uploading..." : "Upload Own Image"}
            <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading || generating} style={{ display: "none" }} />
          </label>
        </div>

        {/* Save & Customize button - shown when image is present */}
        {imageUrl && (
          <button
            type="button"
            className="cpd-btn cpd-btn-customize"
            onClick={handleSaveAndCustomize}
            style={{ marginTop: "10px", width: "100%" }}
          >
            Save & Customize {isCover ? "Cover" : "Back"} Page
          </button>
        )}

        {message && <p className="cpd-message">{message}</p>}
      </div>
    </div>
  );
}

export default CoverPageDesigner;
