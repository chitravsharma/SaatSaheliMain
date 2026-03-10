import React, { useState } from "react";
import axios from "axios";
import "./CoverPageDesigner.css";

const GENERATE_API = `${process.env.REACT_APP_API_URL}/api/generate-image`;
const UPLOAD_API = `${process.env.REACT_APP_API_URL}/api/upload`;

const GENRES = [
  "Fiction", "Romance", "Thriller", "Fantasy", "Children's Book",
  "Poetry", "Self Help", "Mystery", "Sci-Fi", "Non-Fiction",
  "Biography", "History", "Cooking", "Art", "Travel",
];

const AUDIENCES = ["Kids", "Young Adult", "Adults"];

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

function CoverPageDesigner({ type, bookTitle, authorName, imageUrl, onImageChange, onDesignDataChange, initialData }) {
  const isCover = type === "cover";
  const [data, setData] = useState(initialData || {});
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [expandedSections, setExpandedSections] = useState({ book: true, visual: false, typography: false, publishing: false, ai: false });

  const update = (key, value) => {
    const updated = { ...data, [key]: value };
    setData(updated);
    if (onDesignDataChange) onDesignDataChange(updated);
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // AI prompt uses ONLY scene + custom prompt — other fields are page metadata for user to adjust later
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
            <img src={imageUrl} alt={isCover ? "Cover preview" : "Back page preview"} className="cpd-preview-img" />
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

        {message && <p className="cpd-message">{message}</p>}
      </div>
    </div>
  );
}

export default CoverPageDesigner;
