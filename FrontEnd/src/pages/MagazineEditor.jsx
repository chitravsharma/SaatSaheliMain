import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useAuth } from "../AuthContext";
import { useStrings } from "../LanguageContext";
import FlipBook from "../FlipBook";
import ImageEditor from "../components/ImageEditor";
import "./MagazineEditor.css";

const API = process.env.REACT_APP_API_URL;
const TOTAL_PAGES = 50;
const PAGE_W = 550;
const PAGE_H = 700;

const FONT_FAMILIES = [
  { label: "Sans-serif", value: "sans-serif" },
  { label: "Serif", value: "serif" },
  { label: "Monospace", value: "monospace" },
  { label: "Cursive", value: "cursive" },
  { label: "Georgia", value: "'Georgia', serif" },
  { label: "Great Vibes", value: "'Great Vibes', cursive" },
  { label: "Tiro Devanagari", value: "'Tiro Devanagari Hindi', serif" },
  { label: "Arial Black", value: "'Arial Black', sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Comic Sans", value: "'Comic Sans MS', cursive" },
  { label: "Courier New", value: "'Courier New', monospace" },
];

function getClientXY(e) {
  if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

/* ───── DraggableBlock ───── */
function DraggableBlock({ block, type, isSelected, onSelect, onChange, scale, children }) {
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const startRef = useRef({ mx: 0, my: 0, x: 0, y: 0, w: 0, h: 0 });

  const onDragStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    const pos = getClientXY(e);
    setDragging(true);
    startRef.current = { mx: pos.x, my: pos.y, x: block.x, y: block.y };
  }, [block.x, block.y, onSelect]);

  const onResizeStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    const pos = getClientXY(e);
    setResizing(true);
    startRef.current = { mx: pos.x, my: pos.y, w: block.width, h: block.height, x: block.x, y: block.y };
  }, [block.width, block.height, block.x, block.y, onSelect]);

  useEffect(() => {
    if (!dragging && !resizing) return;
    const onMove = (e) => {
      e.preventDefault();
      const pos = getClientXY(e);
      const s = startRef.current;
      if (dragging) {
        const dx = (pos.x - s.mx) / scale;
        const dy = (pos.y - s.my) / scale;
        let nx = Math.round(s.x + dx);
        let ny = Math.round(s.y + dy);
        nx = Math.max(0, Math.min(PAGE_W - block.width, nx));
        ny = Math.max(0, Math.min(PAGE_H - block.height, ny));
        onChange({ ...block, x: nx, y: ny });
      }
      if (resizing) {
        const dx = (pos.x - s.mx) / scale;
        const dy = (pos.y - s.my) / scale;
        let nw = Math.round(Math.max(40, s.w + dx));
        let nh = Math.round(Math.max(30, s.h + dy));
        nw = Math.min(PAGE_W - block.x, nw);
        nh = Math.min(PAGE_H - block.y, nh);
        onChange({ ...block, width: nw, height: nh });
      }
    };
    const onEnd = () => { setDragging(false); setResizing(false); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
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
  }, [dragging, resizing, block, onChange, scale]);

  const isActive = dragging || resizing;
  return (
    <div
      className={`mag-canvas-block ${isSelected ? "mag-block-selected" : ""} ${isActive ? "mag-block-active" : ""}`}
      style={{
        position: "absolute",
        left: block.x * scale, top: block.y * scale,
        width: block.width * scale, height: block.height * scale,
        cursor: dragging ? "grabbing" : "grab",
        zIndex: isActive ? 20 : isSelected ? 10 : 1,
      }}
      onMouseDown={onDragStart}
      onTouchStart={onDragStart}
    >
      {children}
      <span className="mag-block-type-label">{type === "text" ? "T" : "IMG"}</span>
      <div className="mag-resize-handle" onMouseDown={onResizeStart} onTouchStart={onResizeStart} />
      {isActive && <div className="mag-block-dims">{block.width}×{block.height}</div>}
    </div>
  );
}

/* ───── MagazineEditor ───── */
const MagazineEditor = () => {
  const { user } = useAuth();
  const strings = useStrings();
  const s = strings.magazineEditor || {};

  const [magazine, setMagazine] = useState(null);
  const [pages, setPages] = useState([]);
  const [allEditions, setAllEditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPageNum, setSelectedPageNum] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Page editor state
  const [pageContent, setPageContent] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [borderStyle, setBorderStyle] = useState("none");
  const [borderColor, setBorderColor] = useState("#333333");
  const [borderWidth, setBorderWidth] = useState("2");
  const [textBlocks, setTextBlocks] = useState([]);
  const [imageBlocks, setImageBlocks] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [docUploading, setDocUploading] = useState(false);
  const [editorFile, setEditorFile] = useState(null);
  const [editorCallback, setEditorCallback] = useState(null);
  const [moveTarget, setMoveTarget] = useState("");

  const canvasWrapRef = useRef(null);
  const [canvasScale, setCanvasScale] = useState(1);

  const token = localStorage.getItem("saatSaheliToken");
  const headers = { "X-User-Id": String(user?.userId || ""), Authorization: `Bearer ${token}` };

  useEffect(() => {
    const measure = () => {
      if (canvasWrapRef.current) {
        const avail = canvasWrapRef.current.clientWidth;
        setCanvasScale(Math.min(1, avail / PAGE_W));
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [selectedPageNum]);

  const fetchMagazine = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/admin/magazine`, { headers });
      setMagazine(res.data);
      setPages(res.data.pages || []);
    } catch (e) {
      setMessage("Failed to load magazine: " + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllEditions = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/admin/magazines`, { headers });
      setAllEditions(res.data || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchMagazine(); fetchAllEditions(); }, [fetchMagazine, fetchAllEditions]);

  const showMsg = (msg) => { setMessage(msg); setTimeout(() => setMessage(""), 3000); };
  const getPage = (num) => pages.find((p) => p.pageNumber === num);

  const selectPage = (num) => {
    setSelectedPageNum(num);
    setSelectedBlockId(null);
    setShowPreview(false);
    const page = getPage(num);
    if (page) {
      setPageContent(page.content || "");
      try {
        const fmt = JSON.parse(page.format || "{}");
        setBackgroundColor(fmt.backgroundColor || "#ffffff");
        setBorderStyle(fmt.border?.style || "none");
        setBorderColor(fmt.border?.color || "#333333");
        setBorderWidth(fmt.border?.width?.replace("px", "") || "2");
        setTextBlocks(fmt.textBlocks || []);
        setImageBlocks(fmt.imageBlocks || []);
      } catch {
        resetPageState();
      }
    } else {
      setPageContent("");
      resetPageState();
    }
  };

  const resetPageState = () => {
    setBackgroundColor("#ffffff");
    setBorderStyle("none");
    setBorderColor("#333333");
    setBorderWidth("2");
    setTextBlocks([]);
    setImageBlocks([]);
  };

  const buildFormat = () => JSON.stringify({
    backgroundColor,
    border: borderStyle !== "none" ? { style: borderStyle, color: borderColor, width: `${borderWidth}px` } : undefined,
    textBlocks: textBlocks.length > 0 ? textBlocks : undefined,
    imageBlocks: imageBlocks.length > 0 ? imageBlocks : undefined,
  });

  /* ── Save page (all fields optional) ── */
  const handleSavePage = async () => {
    if (!magazine || selectedPageNum === null) return;
    setSaving(true);
    try {
      const existingPage = getPage(selectedPageNum);
      const format = buildFormat();
      if (existingPage) {
        await axios.put(`${API}/api/books/page/${existingPage.id}`, {
          content: pageContent || null,
          pageNumber: selectedPageNum,
          format,
        }, { headers, params: { userId: user.userId } });
      } else {
        await axios.post(`${API}/api/books/${magazine.id}/page`, {
          content: pageContent || null,
          pageNumber: selectedPageNum,
          format,
        }, { headers, params: { userId: user.userId } });
      }
      showMsg(s.saveSuccess || "Page saved!");
      await fetchMagazine();
    } catch (e) {
      showMsg("Save failed: " + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePage = async () => {
    const existingPage = getPage(selectedPageNum);
    if (!existingPage) return;
    if (!window.confirm(`Delete page ${selectedPageNum}?`)) return;
    try {
      await axios.delete(`${API}/api/books/page/${existingPage.id}`, { headers, params: { userId: user.userId } });
      showMsg(s.deleteSuccess || "Page deleted!");
      setSelectedPageNum(null);
      await fetchMagazine();
    } catch (e) {
      showMsg("Delete failed: " + (e.response?.data?.error || e.message));
    }
  };

  /* ── Move page to a new position (shift others) ── */
  const handleMovePage = async (fromNum, toNum) => {
    if (fromNum === toNum || !magazine) return;
    const sourceP = getPage(fromNum);
    if (!sourceP) { showMsg("Source page does not exist"); return; }

    // Collect all existing pages sorted by pageNumber
    const sorted = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);

    // Build new order: remove source, insert at target position
    const without = sorted.filter((p) => p.pageNumber !== fromNum);
    // Find insert index: where target pageNumber would sit
    let insertIdx = without.findIndex((p) => p.pageNumber >= toNum);
    if (insertIdx === -1) insertIdx = without.length;
    without.splice(insertIdx, 0, sourceP);

    // Assign new sequential page numbers starting from the minimum existing
    const updates = [];
    without.forEach((p, idx) => {
      const newNum = idx + 1;
      if (p.pageNumber !== newNum) {
        updates.push({ id: p.id, pageNumber: newNum });
      }
    });

    if (updates.length === 0) return;
    setSaving(true);
    try {
      // Use a temporary high offset to avoid unique constraint conflicts
      const offset = TOTAL_PAGES + 100;
      for (const u of updates) {
        await axios.put(`${API}/api/books/page/${u.id}`, {
          pageNumber: u.pageNumber + offset,
        }, { headers, params: { userId: user.userId } });
      }
      for (const u of updates) {
        await axios.put(`${API}/api/books/page/${u.id}`, {
          pageNumber: u.pageNumber,
        }, { headers, params: { userId: user.userId } });
      }
      showMsg(`Page ${fromNum} moved to position ${toNum}`);
      await fetchMagazine();
      setSelectedPageNum(toNum);
    } catch (e) {
      showMsg("Move failed: " + (e.response?.data?.error || e.message));
      await fetchMagazine();
    } finally {
      setSaving(false);
    }
  };

  /* ── Publish / Unpublish / Save Draft ── */
  const handlePublish = async () => {
    if (!magazine) return;
    try {
      await axios.put(`${API}/api/admin/magazine/${magazine.id}/publish`, {}, { headers });
      showMsg(s.publishSuccess || "Magazine published!");
      await fetchMagazine();
      await fetchAllEditions();
    } catch (e) {
      showMsg("Publish failed: " + (e.response?.data?.error || e.message));
    }
  };

  const handleUnpublish = async () => {
    if (!magazine) return;
    try {
      await axios.put(`${API}/api/admin/magazine/${magazine.id}/unpublish`, {}, { headers });
      showMsg(s.unpublishSuccess || "Magazine unpublished (back to draft)");
      await fetchMagazine();
      await fetchAllEditions();
    } catch (e) {
      showMsg("Unpublish failed: " + (e.response?.data?.error || e.message));
    }
  };

  const handleSaveDraft = async () => {
    if (!magazine) return;
    try {
      await axios.put(`${API}/api/books/${magazine.id}/draft`, null, { headers, params: { userId: user.userId } });
      showMsg(s.draftSaved || "Draft saved!");
      await fetchMagazine();
      await fetchAllEditions();
    } catch (e) {
      showMsg("Save draft failed: " + (e.response?.data?.error || e.message));
    }
  };

  /* ── New edition ── */
  const handleNewEdition = async () => {
    const title = window.prompt(s.newEditionPrompt || "Enter title for new magazine edition:", "Saat Saheli Magazine");
    if (title === null) return;
    try {
      const res = await axios.post(`${API}/api/admin/magazine/new`, { title: title || undefined }, { headers });
      setMagazine(res.data);
      setPages(res.data.pages || []);
      setSelectedPageNum(null);
      showMsg(s.newEditionCreated || "New edition created!");
      await fetchAllEditions();
    } catch (e) {
      showMsg("Failed: " + (e.response?.data?.error || e.message));
    }
  };

  /* ── Export magazine as PDF/DOCX ── */
  const handleMagExport = async (format) => {
    if (!magazine) return;
    showMsg(`Exporting ${format.toUpperCase()}...`);
    try {
      const res = await axios.get(`${API}/api/books/${magazine.id}/export/${format}`, {
        responseType: 'blob',
        headers: { "X-User-Id": String(user.userId) },
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const disposition = res.headers['content-disposition'];
      const filename = disposition ? disposition.split('filename=')[1]?.replace(/"/g, '') : `magazine_${magazine.id}.${format}`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showMsg(`${format.toUpperCase()} downloaded!`);
    } catch (e) {
      let msg = e.message;
      if (e.response?.data instanceof Blob) {
        try { const text = await e.response.data.text(); const json = JSON.parse(text); msg = json.error || text; } catch {}
      } else if (e.response?.data?.error) {
        msg = e.response.data.error;
      }
      showMsg(`Export failed: ${msg}`);
    }
  };

  /* ── Switch to a specific edition ── */
  const switchToEdition = async (editionId) => {
    try {
      const res = await axios.get(`${API}/api/books/${editionId}`, { headers });
      const book = res.data;
      const pagesRes = await axios.get(`${API}/api/books/${editionId}/pages`, { headers });
      book.pages = pagesRes.data || [];
      setMagazine(book);
      setPages(book.pages);
      setSelectedPageNum(null);
      setShowPreview(false);
    } catch (e) {
      showMsg("Failed to load edition: " + (e.response?.data?.error || e.message));
    }
  };

  /* ── Document upload ── */
  const handleDocUpload = async (file) => {
    if (!file || !magazine) return;
    setDocUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("magazineId", magazine.id);
      const res = await axios.post(`${API}/api/admin/magazine/upload-document`, formData, {
        headers: { "X-User-Id": String(user?.userId || "") },
      });
      setMagazine(res.data);
      setPages(res.data.pages || []);
      showMsg(s.docImported || "Document pages imported!");
    } catch (e) {
      showMsg("Upload failed: " + (e.response?.data?.error || e.message));
    } finally {
      setDocUploading(false);
    }
  };

  /* ── Text block helpers ── */
  const addTextBlock = () => {
    const id = `tb${Date.now()}`;
    setTextBlocks((prev) => [...prev, {
      id, content: "New text", fontFamily: "sans-serif", fontSize: "16px",
      color: "#000000", fontWeight: "normal", fontStyle: "normal",
      textAlign: "left", textDecoration: "none",
      x: 20, y: 20, width: 300, height: 60,
    }]);
    setSelectedBlockId(id);
  };

  const updateTextBlock = (id, field, value) => {
    setTextBlocks((prev) => prev.map((tb) => tb.id === id ? { ...tb, [field]: value } : tb));
  };

  const removeTextBlock = (id) => {
    setTextBlocks((prev) => prev.filter((tb) => tb.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  /* ── Image block helpers ── */
  const handleImageUpload = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API}/api/upload`, formData);
      const url = res.data.url || res.data;
      const id = `ib${Date.now()}`;
      setImageBlocks((prev) => [...prev, { id, url, x: 20, y: 100, width: 300, height: 200 }]);
      setSelectedBlockId(id);
    } catch (e) {
      showMsg("Upload failed: " + (e.response?.data?.error || e.message));
    } finally {
      setUploading(false);
    }
  };

  const updateImageBlock = (id, field, value) => {
    setImageBlocks((prev) => prev.map((ib) => ib.id === id ? { ...ib, [field]: value } : ib));
  };

  const removeImageBlock = (id) => {
    setImageBlocks((prev) => prev.filter((ib) => ib.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const resolveUrl = (url) => {
    if (!url) return url;
    if (url.startsWith("/uploads/")) return `${API}${url}`;
    const match = url.match(/\/file\/d\/([^/]+)\//);
    if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
    return url;
  };

  const selectedTextBlock = textBlocks.find((tb) => tb.id === selectedBlockId);
  const selectedImageBlock = imageBlocks.find((ib) => ib.id === selectedBlockId);

  const onCanvasClick = (e) => { if (e.target === e.currentTarget) setSelectedBlockId(null); };

  if (loading) return <div className="loading-spinner" />;

  /* ── Preview mode ── */
  if (showPreview && magazine) {
    return (
      <div className="mag-editor">
        <div className="mag-editor-header">
          <h2>{magazine.title || s.heading} — {s.preview}</h2>
          <button className="mag-btn mag-btn-primary" onClick={() => setShowPreview(false)}>{s.backToEditor}</button>
        </div>
        <FlipBook bookId={magazine.id} />
      </div>
    );
  }

  return (
    <div className="mag-editor">
      <div className="mag-editor-header">
        <h2>{s.heading || "Magazine Editor"}</h2>
        <div className="mag-editor-actions">
          <span className="mag-status">
            {magazine?.title} — {magazine?.status || "DRAFT"}
          </span>
          <button className="mag-btn mag-btn-sm" onClick={() => setShowPreview(true)} disabled={!magazine}>
            {s.preview}
          </button>
          <button className="mag-btn mag-btn-sm" onClick={handleSaveDraft} disabled={!magazine}>
            {s.saveDraft}
          </button>
          {magazine?.status !== "PUBLISHED" ? (
            <button className="mag-btn mag-btn-publish" onClick={handlePublish}>{s.publish}</button>
          ) : (
            <button className="mag-btn mag-btn-danger" onClick={handleUnpublish}>{s.unpublish}</button>
          )}
          <button className="mag-btn mag-btn-sm" onClick={handleNewEdition}>{s.newEdition}</button>
          {magazine && (
            <>
              <button className="mag-btn mag-btn-sm" onClick={() => handleMagExport("pdf")} title="Export PDF">PDF</button>
              <button className="mag-btn mag-btn-sm" onClick={() => handleMagExport("docx")} title="Export DOCX">DOCX</button>
            </>
          )}
        </div>
      </div>
      {message && <div className="mag-message">{message}</div>}

      <div className="mag-editor-body">
        {/* ── Left sidebar: editions + page grid ── */}
        <div className="mag-sidebar">
          {/* Old editions */}
          {allEditions.length > 1 && (
            <div className="mag-editions">
              <h4>{s.editions}</h4>
              <div className="mag-editions-list">
                {allEditions.map((ed) => (
                  <button
                    key={ed.id}
                    className={`mag-edition-item ${ed.id === magazine?.id ? "mag-edition-active" : ""}`}
                    onClick={() => switchToEdition(ed.id)}
                  >
                    <span className="mag-edition-title">{ed.title || s.untitled}</span>
                    <span className={`mag-edition-badge ${ed.status === "PUBLISHED" ? "mag-badge-pub" : "mag-badge-draft"}`}>
                      {ed.status}
                    </span>
                    {ed.modifiedDate && (
                      <span className="mag-edition-date">{new Date(ed.modifiedDate).toLocaleDateString()}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Document upload */}
          <div className="mag-doc-upload">
            <label className="mag-btn mag-btn-sm mag-upload-btn mag-doc-btn">
              {docUploading ? s.importing : s.uploadDoc}
              <input type="file" accept=".pdf,.docx,.doc" hidden disabled={docUploading}
                onChange={(e) => e.target.files[0] && handleDocUpload(e.target.files[0])} />
            </label>
          </div>

          {/* Page grid */}
          <div className="mag-page-list">
            <h3>{s.pages}</h3>
            <div className="mag-page-grid">
              {Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1).map((num) => {
                const exists = !!getPage(num);
                const isSelected = selectedPageNum === num;
                return (
                  <button
                    key={num}
                    className={`mag-page-slot ${exists ? "mag-page-filled" : ""} ${isSelected ? "mag-page-selected" : ""}`}
                    onClick={() => selectPage(num)}
                  >
                    <span className="mag-page-num">{num}</span>
                    {num === 1 && <span className="mag-page-label">{s.cover}</span>}
                    {num === TOTAL_PAGES && <span className="mag-page-label">{s.back}</span>}
                    {!exists && num !== 1 && num !== TOTAL_PAGES && <span className="mag-page-label">{s.emptyPage || "Empty"}</span>}
                  </button>
                );
              })}
            </div>

            {/* Move page controls */}
            {selectedPageNum !== null && getPage(selectedPageNum) && (
              <div className="mag-move-controls">
                <span className="mag-move-label">Move page {selectedPageNum} to:</span>
                <input
                  type="number"
                  className="mag-move-input"
                  min={1}
                  max={TOTAL_PAGES}
                  value={moveTarget}
                  onChange={(e) => setMoveTarget(e.target.value)}
                  placeholder="#"
                />
                <button
                  className="mag-btn mag-btn-sm"
                  disabled={saving || !moveTarget || Number(moveTarget) === selectedPageNum || Number(moveTarget) < 1 || Number(moveTarget) > TOTAL_PAGES}
                  onClick={() => { handleMovePage(selectedPageNum, Number(moveTarget)); setMoveTarget(""); }}
                >
                  Move
                </button>
                <button
                  className="mag-btn mag-btn-sm"
                  disabled={saving || selectedPageNum <= 1}
                  onClick={() => handleMovePage(selectedPageNum, selectedPageNum - 1)}
                  title="Move up"
                >
                  &#9650;
                </button>
                <button
                  className="mag-btn mag-btn-sm"
                  disabled={saving || selectedPageNum >= TOTAL_PAGES}
                  onClick={() => handleMovePage(selectedPageNum, selectedPageNum + 1)}
                  title="Move down"
                >
                  &#9660;
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Page editor ── */}
        {selectedPageNum !== null && (
          <div className="mag-page-editor">
            <h3>{s.editPage || "Edit Page"} {selectedPageNum}</h3>

            {/* Toolbar */}
            <div className="mag-toolbar">
              <button className="mag-btn mag-btn-sm" onClick={addTextBlock}>{s.addTextBlock}</button>
              <label className="mag-btn mag-btn-sm mag-upload-btn">
                {uploading ? s.uploading : s.addImageBlock}
                <input type="file" accept="image/*" hidden disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (!f) return;
                    setEditorFile(f);
                    setEditorCallback(() => (editedFile) => {
                      handleImageUpload(editedFile);
                      setEditorFile(null);
                      setEditorCallback(null);
                    });
                    e.target.value = "";
                  }} />
              </label>
              <span className="mag-toolbar-sep" />
              <label className="mag-toolbar-label">{s.bg}
                <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
              </label>
              <label className="mag-toolbar-label">{s.border}
                <select value={borderStyle} onChange={(e) => setBorderStyle(e.target.value)}>
                  <option value="none">{s.none}</option>
                  <option value="solid">{s.solid}</option>
                  <option value="dashed">{s.dashed}</option>
                  <option value="dotted">{s.dotted}</option>
                  <option value="double">{s.double}</option>
                </select>
              </label>
              {borderStyle !== "none" && (
                <>
                  <label className="mag-toolbar-label">
                    <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} />
                  </label>
                  <label className="mag-toolbar-label">
                    <input type="number" min="1" max="10" value={borderWidth}
                      onChange={(e) => setBorderWidth(e.target.value)} style={{ width: 44 }} /> px
                  </label>
                </>
              )}
            </div>

            {/* Selected text block props */}
            {selectedTextBlock && (
              <div className="mag-props-panel">
                <div className="mag-props-row">
                  <textarea
                    className="mag-props-textarea"
                    value={selectedTextBlock.content}
                    onChange={(e) => updateTextBlock(selectedTextBlock.id, "content", e.target.value)}
                    rows={2}
                    placeholder={s.enterText}
                  />
                </div>
                <div className="mag-props-row">
                  <label>{s.fontFamily}
                    <select value={selectedTextBlock.fontFamily}
                      onChange={(e) => updateTextBlock(selectedTextBlock.id, "fontFamily", e.target.value)}>
                      {FONT_FAMILIES.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>{s.fontSize}
                    <input type="text" value={selectedTextBlock.fontSize}
                      onChange={(e) => updateTextBlock(selectedTextBlock.id, "fontSize", e.target.value)}
                      style={{ width: 56 }} />
                  </label>
                  <label>{s.fontColor}
                    <input type="color" value={selectedTextBlock.color}
                      onChange={(e) => updateTextBlock(selectedTextBlock.id, "color", e.target.value)} />
                  </label>
                </div>
                <div className="mag-props-row">
                  <button
                    className={`mag-fmt-btn ${selectedTextBlock.fontWeight === "bold" ? "mag-fmt-active" : ""}`}
                    onClick={() => updateTextBlock(selectedTextBlock.id, "fontWeight",
                      selectedTextBlock.fontWeight === "bold" ? "normal" : "bold")}
                    title={s.bold}><b>B</b></button>
                  <button
                    className={`mag-fmt-btn ${selectedTextBlock.fontStyle === "italic" ? "mag-fmt-active" : ""}`}
                    onClick={() => updateTextBlock(selectedTextBlock.id, "fontStyle",
                      selectedTextBlock.fontStyle === "italic" ? "normal" : "italic")}
                    title={s.italic}><i>I</i></button>
                  <button
                    className={`mag-fmt-btn ${selectedTextBlock.textDecoration === "underline" ? "mag-fmt-active" : ""}`}
                    onClick={() => updateTextBlock(selectedTextBlock.id, "textDecoration",
                      selectedTextBlock.textDecoration === "underline" ? "none" : "underline")}
                    title={s.underline}><u>U</u></button>
                  <span className="mag-toolbar-sep" />
                  <select value={selectedTextBlock.textAlign || "left"}
                    onChange={(e) => updateTextBlock(selectedTextBlock.id, "textAlign", e.target.value)}>
                    <option value="left">{s.left}</option>
                    <option value="center">{s.center}</option>
                    <option value="right">{s.right}</option>
                  </select>
                  <span className="mag-toolbar-sep" />
                  <button className="mag-btn mag-btn-danger mag-btn-xs" onClick={() => removeTextBlock(selectedTextBlock.id)}>{s.remove}</button>
                </div>
              </div>
            )}

            {/* Selected image block props */}
            {selectedImageBlock && (
              <div className="mag-props-panel">
                <div className="mag-props-row">
                  <img src={resolveUrl(selectedImageBlock.url)} alt="" className="mag-props-thumb" />
                  <div className="mag-props-info">
                    <span>{selectedImageBlock.width} × {selectedImageBlock.height}</span>
                    <label className="mag-btn mag-btn-sm mag-upload-btn" style={{ marginTop: 4 }}>
                      {s.replace}
                      <input type="file" accept="image/*" hidden onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const blockId = selectedImageBlock.id;
                        setEditorFile(file);
                        setEditorCallback(() => async (editedFile) => {
                          setUploading(true);
                          try {
                            const formData = new FormData();
                            formData.append("file", editedFile);
                            const res = await axios.post(`${API}/api/upload`, formData, {
                              headers: { "X-User-Id": String(user?.userId || "") },
                            });
                            updateImageBlock(blockId, "url", res.data.url || res.data);
                          } catch (err) {
                            showMsg("Upload failed: " + (err.response?.data?.error || err.message));
                          } finally {
                            setUploading(false);
                          }
                          setEditorFile(null);
                          setEditorCallback(null);
                        });
                        e.target.value = "";
                      }} />
                    </label>
                  </div>
                  <button className="mag-btn mag-btn-danger mag-btn-xs" onClick={() => removeImageBlock(selectedImageBlock.id)}>{s.remove}</button>
                </div>
                <div className="mag-props-row">
                  <label>{s.fit}
                    <select value={selectedImageBlock.objectFit || "cover"}
                      onChange={(e) => updateImageBlock(selectedImageBlock.id, "objectFit", e.target.value)}>
                      <option value="cover">{s.fillCrop}</option>
                      <option value="contain">{s.fitShowFull}</option>
                      <option value="fill">{s.stretch}</option>
                    </select>
                  </label>
                  <label>{s.opacity}
                    <input type="range" min="10" max="100" value={selectedImageBlock.opacity || 100}
                      onChange={(e) => updateImageBlock(selectedImageBlock.id, "opacity", +e.target.value)}
                      style={{ width: 80 }} />
                    <span style={{ fontSize: "0.7rem" }}>{selectedImageBlock.opacity || 100}%</span>
                  </label>
                  <button className="mag-btn mag-btn-sm" onClick={() => {
                    updateImageBlock(selectedImageBlock.id, "x", 0);
                    updateImageBlock(selectedImageBlock.id, "y", 0);
                    updateImageBlock(selectedImageBlock.id, "width", PAGE_W);
                    updateImageBlock(selectedImageBlock.id, "height", PAGE_H);
                    updateImageBlock(selectedImageBlock.id, "objectFit", "contain");
                  }}>{s.fitToPage}</button>
                  <button className="mag-btn mag-btn-sm" onClick={() => {
                    updateImageBlock(selectedImageBlock.id, "x", 0);
                    updateImageBlock(selectedImageBlock.id, "y", 0);
                    updateImageBlock(selectedImageBlock.id, "width", PAGE_W);
                    updateImageBlock(selectedImageBlock.id, "height", PAGE_H);
                    updateImageBlock(selectedImageBlock.id, "objectFit", "cover");
                  }}>{s.fillPage}</button>
                </div>
              </div>
            )}

            {/* ── Interactive canvas ── */}
            <div className="mag-canvas-wrap" ref={canvasWrapRef}>
              <div className="mag-canvas-hint">{s.canvasHint}</div>
              <div
                className="mag-canvas"
                style={{
                  width: PAGE_W * canvasScale,
                  height: PAGE_H * canvasScale,
                  backgroundColor,
                  border: borderStyle !== "none"
                    ? `${borderWidth}px ${borderStyle} ${borderColor}`
                    : "1px solid #ddd",
                }}
                onClick={onCanvasClick}
              >
                {textBlocks.map((tb) => (
                  <DraggableBlock
                    key={tb.id} block={tb} type="text"
                    isSelected={selectedBlockId === tb.id}
                    onSelect={() => setSelectedBlockId(tb.id)}
                    onChange={(updated) => setTextBlocks(textBlocks.map((t) => t.id === tb.id ? updated : t))}
                    scale={canvasScale}
                  >
                    <div style={{
                      width: "100%", height: "100%",
                      fontFamily: tb.fontFamily,
                      fontSize: `${parseFloat(tb.fontSize) * canvasScale}px`,
                      color: tb.color,
                      fontWeight: tb.fontWeight || "normal",
                      fontStyle: tb.fontStyle || "normal",
                      textDecoration: tb.textDecoration || "none",
                      textAlign: tb.textAlign || "left",
                      whiteSpace: "pre-wrap", wordBreak: "break-word",
                      overflow: "hidden", lineHeight: 1.4,
                      pointerEvents: "none", userSelect: "none",
                    }}
                      dangerouslySetInnerHTML={{ __html: tb.content }}
                    />
                  </DraggableBlock>
                ))}

                {imageBlocks.map((ib) => (
                  <DraggableBlock
                    key={ib.id} block={ib} type="image"
                    isSelected={selectedBlockId === ib.id}
                    onSelect={() => setSelectedBlockId(ib.id)}
                    onChange={(updated) => setImageBlocks(imageBlocks.map((i) => i.id === ib.id ? updated : i))}
                    scale={canvasScale}
                  >
                    <img src={resolveUrl(ib.url)} alt="" draggable={false}
                      style={{
                        width: "100%", height: "100%",
                        objectFit: ib.objectFit || "cover",
                        borderRadius: 2,
                        pointerEvents: "none", userSelect: "none",
                        opacity: (ib.opacity || 100) / 100,
                      }} />
                  </DraggableBlock>
                ))}

                <span className="mag-canvas-page-num">{selectedPageNum}</span>
              </div>
            </div>

            {/* Page text for search / TTS (optional) */}
            <div className="mag-editor-section">
              <label className="mag-section-label">{s.pageTextLabel}</label>
              <textarea
                className="mag-textarea"
                value={pageContent}
                onChange={(e) => setPageContent(e.target.value)}
                rows={3}
                placeholder={s.pageTextPlaceholder}
              />
            </div>

            {/* Actions */}
            <div className="mag-editor-actions-bottom">
              <button className="mag-btn mag-btn-primary" onClick={handleSavePage} disabled={saving}>
                {saving ? s.saving : s.savePage}
              </button>
              {getPage(selectedPageNum) && (
                <button className="mag-btn mag-btn-danger" onClick={handleDeletePage}>{s.deletePage || "Delete Page"}</button>
              )}
            </div>
          </div>
        )}
      </div>
      {editorFile && (
        <ImageEditor
          file={editorFile}
          onDone={(editedFile) => editorCallback && editorCallback(editedFile)}
          onCancel={() => { setEditorFile(null); setEditorCallback(null); }}
        />
      )}
    </div>
  );
};

export default MagazineEditor;
