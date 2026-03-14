import React, { useState, useRef } from "react";
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

function CoverPageDesigner({ type, bookTitle, authorName, imageUrl, onImageChange, onDesignDataChange, initialData }) {
  const isCover = type === "cover";
  const [data, setData] = useState(initialData || {});
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [expandedSections, setExpandedSections] = useState({ book: true, visual: false, typography: false, publishing: false, ai: false });
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [imageScale, setImageScale] = useState(initialData?.imageScale || 100);
  const [authorPhotoUrl, setAuthorPhotoUrl] = useState(initialData?.authorPhotoUrl || "");
  const [uploadingAuthorPhoto, setUploadingAuthorPhoto] = useState(false);
  const customizerRef = useRef(null);

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
    // Save design data with imageScale
    const updated = { ...data, imageScale, authorPhotoUrl };
    setData(updated);
    if (onDesignDataChange) onDesignDataChange(updated);
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

  // Get font family based on titleFontStyle
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

  // Render the visual customizer preview
  const renderCustomizer = () => {
    if (!imageUrl) return null;

    const titleText = data.title || bookTitle || "Book Title";
    const subtitleText = data.subtitle || "";
    const authorText = data.author || authorName || "Author Name";
    const taglineText = data.tagline || "";
    const seriesText = data.series || "";
    const alignment = (data.textAlignment || "Center").toLowerCase();

    const textAlign = alignment === "top" ? "flex-start" : alignment === "bottom" ? "flex-end" : "center";
    const fontFamily = getFontFamily();
    const authorSize = data.authorNameSize === "Large" ? "1.1rem" : data.authorNameSize === "Small" ? "0.7rem" : "0.85rem";

    // Back page fields
    const blurbText = data.blurb || "";
    const authorBioText = data.authorBio || "";
    const isbnText = data.isbn || "";
    const publisherText = data.publisher || "";
    const priceText = data.price || "";

    return (
      <div className="cpd-customizer" ref={customizerRef}>
        <h3 className="cpd-heading">
          {isCover ? "Customize Cover Page" : "Customize Back Page"}
        </h3>
        <p className="cpd-hint">
          Adjust the image size and see your text overlaid on the {isCover ? "cover" : "back page"}.
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

        {/* Visual Preview */}
        <div className="cpd-visual-preview">
          <div
            className="cpd-cover-canvas"
            style={{ overflow: "hidden" }}
          >
            <img
              src={resolveUrl(imageUrl)}
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

            {/* Text Overlay */}
            {isCover ? (
              <div className="cpd-text-overlay" style={{ justifyContent: textAlign }}>
                {seriesText && (
                  <span className="cpd-overlay-series" style={{ fontFamily }}>{seriesText}</span>
                )}
                <span className="cpd-overlay-title" style={{ fontFamily }}>
                  {titleText}
                </span>
                {subtitleText && (
                  <span className="cpd-overlay-subtitle" style={{ fontFamily }}>{subtitleText}</span>
                )}
                {taglineText && (
                  <span className="cpd-overlay-tagline" style={{ fontFamily }}>{taglineText}</span>
                )}
                <span className="cpd-overlay-author" style={{ fontFamily, fontSize: authorSize }}>
                  {authorText}
                </span>
              </div>
            ) : (
              <div className="cpd-text-overlay cpd-back-overlay">
                <span className="cpd-overlay-back-title" style={{ fontFamily }}>
                  {titleText}
                </span>
                {blurbText && (
                  <p className="cpd-overlay-blurb">{blurbText}</p>
                )}
                {authorBioText && (
                  <div className="cpd-overlay-bio-section">
                    {authorPhotoUrl && (
                      <img src={resolveUrl(authorPhotoUrl)} alt="Author" className="cpd-overlay-author-photo" />
                    )}
                    <p className="cpd-overlay-bio">{authorBioText}</p>
                  </div>
                )}
                {taglineText && (
                  <span className="cpd-overlay-tagline">{taglineText}</span>
                )}
                <span className="cpd-overlay-author" style={{ fontSize: authorSize }}>
                  {authorText}
                </span>
                <div className="cpd-overlay-bottom-row">
                  {publisherText && <span className="cpd-overlay-publisher">{publisherText}</span>}
                  {isbnText && <span className="cpd-overlay-isbn">ISBN: {isbnText}</span>}
                  {priceText && <span className="cpd-overlay-price">{priceText}</span>}
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          className="cpd-btn cpd-btn-generate"
          onClick={() => setShowCustomizer(false)}
          style={{ marginTop: "12px" }}
        >
          Back to Design Form
        </button>
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
