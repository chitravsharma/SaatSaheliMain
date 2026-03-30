import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../AuthContext";
import { useStrings } from "../LanguageContext";
import "./MagazineEditor.css";

const API = process.env.REACT_APP_API_URL;
const TOTAL_PAGES = 50;

const MagazineEditor = () => {
  const { user } = useAuth();
  const strings = useStrings();
  const s = strings.magazineEditor || {};

  const [magazine, setMagazine] = useState(null);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPageNum, setSelectedPageNum] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Page editor state
  const [pageContent, setPageContent] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [borderStyle, setBorderStyle] = useState("none");
  const [borderColor, setBorderColor] = useState("#333333");
  const [borderWidth, setBorderWidth] = useState("2");
  const [textBlocks, setTextBlocks] = useState([]);
  const [imageBlocks, setImageBlocks] = useState([]);
  const [uploading, setUploading] = useState(false);

  const token = localStorage.getItem("saatSaheliToken");
  const headers = { "X-User-Id": String(user?.userId || ""), Authorization: `Bearer ${token}` };

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

  useEffect(() => { fetchMagazine(); }, [fetchMagazine]);

  const showMsg = (msg) => { setMessage(msg); setTimeout(() => setMessage(""), 3000); };

  // Find existing page object for a given pageNumber
  const getPage = (num) => pages.find((p) => p.pageNumber === num);

  // Load page data into editor
  const selectPage = (num) => {
    setSelectedPageNum(num);
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
        setBackgroundColor("#ffffff");
        setBorderStyle("none");
        setBorderColor("#333333");
        setBorderWidth("2");
        setTextBlocks([]);
        setImageBlocks([]);
      }
    } else {
      setPageContent("");
      setBackgroundColor("#ffffff");
      setBorderStyle("none");
      setBorderColor("#333333");
      setBorderWidth("2");
      setTextBlocks([]);
      setImageBlocks([]);
    }
  };

  const buildFormat = () => JSON.stringify({
    backgroundColor,
    border: borderStyle !== "none" ? { style: borderStyle, color: borderColor, width: `${borderWidth}px` } : undefined,
    textBlocks: textBlocks.length > 0 ? textBlocks : undefined,
    imageBlocks: imageBlocks.length > 0 ? imageBlocks : undefined,
  });

  const handleSavePage = async () => {
    if (!magazine || selectedPageNum === null) return;
    setSaving(true);
    try {
      const existingPage = getPage(selectedPageNum);
      const format = buildFormat();
      if (existingPage) {
        await axios.put(`${API}/api/books/page/${existingPage.id}`, {
          content: pageContent,
          pageNumber: selectedPageNum,
          format,
        }, { headers, params: { userId: user.userId } });
      } else {
        await axios.post(`${API}/api/books/${magazine.id}/page`, {
          content: pageContent,
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

  const handlePublish = async () => {
    try {
      await axios.put(`${API}/api/admin/magazine/publish`, {}, { headers });
      showMsg(s.publishSuccess || "Magazine published!");
      await fetchMagazine();
    } catch (e) {
      showMsg("Publish failed: " + (e.response?.data?.error || e.message));
    }
  };

  // Text block helpers
  const addTextBlock = () => {
    setTextBlocks([...textBlocks, {
      id: `tb${Date.now()}`,
      content: "New text",
      fontFamily: "sans-serif",
      fontSize: "16px",
      color: "#000000",
      x: 20, y: 20, width: 300, height: 60,
    }]);
  };

  const updateTextBlock = (id, field, value) => {
    setTextBlocks(textBlocks.map((tb) => tb.id === id ? { ...tb, [field]: value } : tb));
  };

  const removeTextBlock = (id) => {
    setTextBlocks(textBlocks.filter((tb) => tb.id !== id));
  };

  // Image block helpers
  const handleImageUpload = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API}/api/upload`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" },
      });
      const url = res.data.url || res.data;
      setImageBlocks([...imageBlocks, {
        id: `ib${Date.now()}`,
        url,
        x: 20, y: 100, width: 300, height: 200,
      }]);
    } catch (e) {
      showMsg("Upload failed: " + (e.response?.data?.error || e.message));
    } finally {
      setUploading(false);
    }
  };

  const updateImageBlock = (id, field, value) => {
    setImageBlocks(imageBlocks.map((ib) => ib.id === id ? { ...ib, [field]: value } : ib));
  };

  const removeImageBlock = (id) => {
    setImageBlocks(imageBlocks.filter((ib) => ib.id !== id));
  };

  if (loading) return <div className="loading-spinner" />;

  return (
    <div className="mag-editor">
      <div className="mag-editor-header">
        <h2>{s.heading || "Magazine Editor"}</h2>
        <div className="mag-editor-actions">
          <span className="mag-status">Status: {magazine?.status || "DRAFT"}</span>
          <button className="mag-btn mag-btn-publish" onClick={handlePublish}>{s.publish || "Publish Magazine"}</button>
        </div>
      </div>
      {message && <div className="mag-message">{message}</div>}

      <div className="mag-editor-body">
        {/* Page list sidebar */}
        <div className="mag-page-list">
          <h3>Pages</h3>
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
                  {num === 1 && <span className="mag-page-label">Cover</span>}
                  {num === TOTAL_PAGES && <span className="mag-page-label">Back</span>}
                  {!exists && num !== 1 && num !== TOTAL_PAGES && <span className="mag-page-label">{s.emptyPage || "Empty"}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Page editor */}
        {selectedPageNum !== null && (
          <div className="mag-page-editor">
            <h3>{s.editPage || "Edit Page"} {selectedPageNum}</h3>

            {/* Page background & border */}
            <div className="mag-editor-row">
              <label>{s.backgroundColor || "Background Color"}
                <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
              </label>
              <label>{s.borderStyle || "Border Style"}
                <select value={borderStyle} onChange={(e) => setBorderStyle(e.target.value)}>
                  <option value="none">None</option>
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                  <option value="double">Double</option>
                </select>
              </label>
              {borderStyle !== "none" && (
                <>
                  <label>{s.borderColor || "Border Color"}
                    <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} />
                  </label>
                  <label>{s.borderWidth || "Border Width"}
                    <input type="number" min="1" max="10" value={borderWidth} onChange={(e) => setBorderWidth(e.target.value)} style={{ width: 60 }} /> px
                  </label>
                </>
              )}
            </div>

            {/* Page content (plain text for TTS/search) */}
            <div className="mag-editor-section">
              <label>Page Text (for search & read-aloud)</label>
              <textarea
                className="mag-textarea"
                value={pageContent}
                onChange={(e) => setPageContent(e.target.value)}
                rows={3}
                placeholder="Optional plain text content..."
              />
            </div>

            {/* Text Blocks */}
            <div className="mag-editor-section">
              <div className="mag-section-header">
                <h4>{s.addTextBlock || "Text Blocks"}</h4>
                <button className="mag-btn mag-btn-sm" onClick={addTextBlock}>+ Add Text</button>
              </div>
              {textBlocks.map((tb) => (
                <div key={tb.id} className="mag-block-card">
                  <textarea
                    value={tb.content}
                    onChange={(e) => updateTextBlock(tb.id, "content", e.target.value)}
                    rows={2}
                    className="mag-textarea"
                    placeholder="Enter text..."
                  />
                  <div className="mag-block-controls">
                    <label>{s.fontFamily || "Font"}
                      <select value={tb.fontFamily} onChange={(e) => updateTextBlock(tb.id, "fontFamily", e.target.value)}>
                        <option value="sans-serif">Sans-serif</option>
                        <option value="serif">Serif</option>
                        <option value="monospace">Monospace</option>
                        <option value="cursive">Cursive</option>
                        <option value="'Georgia', serif">Georgia</option>
                        <option value="'Great Vibes', cursive">Great Vibes</option>
                        <option value="'Tiro Devanagari Hindi', serif">Tiro Devanagari</option>
                      </select>
                    </label>
                    <label>{s.fontSize || "Size"}
                      <input type="text" value={tb.fontSize} onChange={(e) => updateTextBlock(tb.id, "fontSize", e.target.value)} style={{ width: 60 }} />
                    </label>
                    <label>{s.fontColor || "Color"}
                      <input type="color" value={tb.color} onChange={(e) => updateTextBlock(tb.id, "color", e.target.value)} />
                    </label>
                  </div>
                  <div className="mag-block-controls">
                    <label>X <input type="number" value={tb.x} onChange={(e) => updateTextBlock(tb.id, "x", +e.target.value)} style={{ width: 60 }} /></label>
                    <label>Y <input type="number" value={tb.y} onChange={(e) => updateTextBlock(tb.id, "y", +e.target.value)} style={{ width: 60 }} /></label>
                    <label>W <input type="number" value={tb.width} onChange={(e) => updateTextBlock(tb.id, "width", +e.target.value)} style={{ width: 60 }} /></label>
                    <label>H <input type="number" value={tb.height} onChange={(e) => updateTextBlock(tb.id, "height", +e.target.value)} style={{ width: 60 }} /></label>
                    <button className="mag-btn mag-btn-danger" onClick={() => removeTextBlock(tb.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Image Blocks */}
            <div className="mag-editor-section">
              <div className="mag-section-header">
                <h4>{s.addImageBlock || "Image Blocks"}</h4>
                <label className="mag-btn mag-btn-sm mag-upload-btn">
                  {uploading ? "Uploading..." : "+ Add Image"}
                  <input type="file" accept="image/*" hidden disabled={uploading}
                    onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0])} />
                </label>
              </div>
              {imageBlocks.map((ib) => (
                <div key={ib.id} className="mag-block-card">
                  <div className="mag-img-preview">
                    <img src={ib.url} alt="" style={{ maxWidth: 120, maxHeight: 80, objectFit: "cover", borderRadius: 4 }} />
                  </div>
                  <div className="mag-block-controls">
                    <label>X <input type="number" value={ib.x} onChange={(e) => updateImageBlock(ib.id, "x", +e.target.value)} style={{ width: 60 }} /></label>
                    <label>Y <input type="number" value={ib.y} onChange={(e) => updateImageBlock(ib.id, "y", +e.target.value)} style={{ width: 60 }} /></label>
                    <label>W <input type="number" value={ib.width} onChange={(e) => updateImageBlock(ib.id, "width", +e.target.value)} style={{ width: 60 }} /></label>
                    <label>H <input type="number" value={ib.height} onChange={(e) => updateImageBlock(ib.id, "height", +e.target.value)} style={{ width: 60 }} /></label>
                    <button className="mag-btn mag-btn-danger" onClick={() => removeImageBlock(ib.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Preview */}
            <div className="mag-editor-section">
              <h4>{s.preview || "Preview"}</h4>
              <div className="mag-preview" style={{
                width: 275, height: 350,
                backgroundColor,
                border: borderStyle !== "none" ? `${borderWidth}px ${borderStyle} ${borderColor}` : "1px solid #ddd",
                position: "relative", overflow: "hidden", borderRadius: 4,
              }}>
                {textBlocks.map((tb) => (
                  <div key={tb.id} style={{
                    position: "absolute",
                    left: tb.x * 0.5, top: tb.y * 0.5,
                    width: tb.width * 0.5, height: tb.height ? tb.height * 0.5 : "auto",
                    fontFamily: tb.fontFamily, fontSize: `${parseFloat(tb.fontSize) * 0.5}px`,
                    color: tb.color, whiteSpace: "pre-wrap", wordBreak: "break-word", overflow: "hidden",
                  }}>
                    {tb.content}
                  </div>
                ))}
                {imageBlocks.map((ib) => (
                  <img key={ib.id} src={ib.url} alt="" style={{
                    position: "absolute",
                    left: ib.x * 0.5, top: ib.y * 0.5,
                    width: ib.width * 0.5, height: ib.height * 0.5,
                    objectFit: "cover", borderRadius: 2,
                  }} />
                ))}
                <span style={{ position: "absolute", bottom: 4, right: 6, fontSize: 10, color: "#999" }}>{selectedPageNum}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="mag-editor-actions-bottom">
              <button className="mag-btn mag-btn-primary" onClick={handleSavePage} disabled={saving}>
                {saving ? "Saving..." : (s.editPage || "Save Page")}
              </button>
              {getPage(selectedPageNum) && (
                <button className="mag-btn mag-btn-danger" onClick={handleDeletePage}>{s.deletePage || "Delete Page"}</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MagazineEditor;
