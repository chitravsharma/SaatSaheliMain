import React, { useState } from "react";
import axios from "axios";
import FlipBook from "../FlipBook";
import PageLayoutEditor from "../PageLayoutEditor";
import "../BookManager.css";

const API = "http://localhost:8081/api/books";
const UPLOAD_API = "http://localhost:8081/api/upload";

// Helper to resolve image URL (supports local uploads and Drive URLs)
function resolveImageUrl(url) {
  if (!url) return url;
  // Local upload path
  if (url.startsWith("/uploads/")) {
    return `http://localhost:8081${url}`;
  }
  // Google Drive shareable link
  const match = url.match(/\/file\/d\/([^/]+)\//);
  if (match) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
  }
  return url;
}

const DEFAULT_FORMAT = {
  fontFamily: "sans-serif",
  fontSize: "16px",
  color: "#1a1a2e",
  layout: {},
};

function BookManager() {
  const [view, setView] = useState("menu");
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [pages, setPages] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Page form state
  const [pageContent, setPageContent] = useState("");
  const [pageNumber, setPageNumber] = useState("");
  const [pageImageUrl, setPageImageUrl] = useState("");
  const [pageImageUrl2, setPageImageUrl2] = useState("");
  const [editingPage, setEditingPage] = useState(null);

  // Format state
  const [formatFontFamily, setFormatFontFamily] = useState("sans-serif");
  const [formatFontSize, setFormatFontSize] = useState("16px");
  const [formatColor, setFormatColor] = useState("#1a1a2e");
  const [pageLayout, setPageLayout] = useState({});

  // Upload state
  const [uploading1, setUploading1] = useState(false);
  const [uploading2, setUploading2] = useState(false);
  const [editUploading1, setEditUploading1] = useState(false);
  const [editUploading2, setEditUploading2] = useState(false);

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const buildFormatJson = (family, size, color, layout) => {
    return JSON.stringify({ fontFamily: family, fontSize: size, color: color, layout: layout || {} });
  };

  const parseFormatJson = (formatStr) => {
    try {
      const parsed = JSON.parse(formatStr);
      return {
        fontFamily: parsed.fontFamily || "sans-serif",
        fontSize: parsed.fontSize || "16px",
        color: parsed.color || "#1a1a2e",
        layout: parsed.layout || {},
      };
    } catch {
      return { ...DEFAULT_FORMAT };
    }
  };

  const handleUpload = async (file, setUrl, setUploadingState) => {
    if (!file) return;
    setUploadingState(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(UPLOAD_API, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUrl(res.data.url);
      showMessage("Image uploaded!");
    } catch (err) {
      showMessage("Upload failed: " + (err.response?.data?.error || err.message));
    } finally {
      setUploadingState(false);
    }
  };

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/user/1`);
      setBooks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/user/1/drafts`);
      setBooks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookPages = async (bookId) => {
    try {
      const res = await axios.get(`${API}/${bookId}/pages`);
      setPages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setPages([]);
    }
  };

  const handleCreateBook = async () => {
    if (!newTitle.trim()) {
      showMessage("Please enter a book title");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post(`${API}/create`, { title: newTitle, userId: 1 });
      setSelectedBook(res.data);
      setPages(res.data.pages || []);
      setNewTitle("");
      showMessage("Book created as Draft!");
      setView("edit");
    } catch (err) {
      showMessage("Failed to create book: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEditBook = async (book) => {
    setSelectedBook(book);
    await fetchBookPages(book.id);
    setView("edit");
  };

  const handleUpdateTitle = async () => {
    if (!selectedBook) return;
    try {
      const res = await axios.put(`${API}/${selectedBook.id}`, { title: selectedBook.title });
      setSelectedBook(res.data);
      showMessage("Title updated!");
    } catch (err) {
      showMessage("Failed to update title");
    }
  };

  const handlePublish = async () => {
    if (!selectedBook) return;
    try {
      const res = await axios.put(`${API}/${selectedBook.id}/publish`);
      setSelectedBook(res.data);
      showMessage("Book published!");
    } catch (err) {
      showMessage("Failed to publish");
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedBook) return;
    try {
      const res = await axios.put(`${API}/${selectedBook.id}/draft`);
      setSelectedBook(res.data);
      showMessage("Saved as draft!");
    } catch (err) {
      showMessage("Failed to save draft");
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (!window.confirm("Are you sure you want to delete this book and all its pages?")) return;
    try {
      await axios.delete(`${API}/${bookId}`);
      showMessage("Book deleted!");
      setSelectedBook(null);
      setPages([]);
      setView("menu");
    } catch (err) {
      showMessage("Failed to delete book");
    }
  };

  const handleAddPage = async () => {
    if (!selectedBook) return;
    if (!pageNumber) {
      showMessage("Page number is required");
      return;
    }
    try {
      const formatJson = buildFormatJson(formatFontFamily, formatFontSize, formatColor, pageLayout);
      await axios.post(`${API}/${selectedBook.id}/page`, {
        pageNumber: parseInt(pageNumber),
        content: pageContent,
        format: formatJson,
        imageUrl: pageImageUrl,
        imageUrl2: pageImageUrl2,
      });
      showMessage("Page added!");
      setPageContent("");
      setPageNumber("");
      setPageImageUrl("");
      setPageImageUrl2("");
      setFormatFontFamily("sans-serif");
      setFormatFontSize("16px");
      setFormatColor("#1a1a2e");
      setPageLayout({});
      await fetchBookPages(selectedBook.id);
    } catch (err) {
      showMessage("Failed to add page");
    }
  };

  const handleUpdatePage = async () => {
    if (!editingPage) return;
    try {
      await axios.put(`${API}/page/${editingPage.id}`, {
        pageNumber: editingPage.pageNumber,
        content: editingPage.content,
        format: editingPage.format,
        imageUrl: editingPage.imageUrl,
        imageUrl2: editingPage.imageUrl2,
      });
      showMessage("Page updated!");
      setEditingPage(null);
      await fetchBookPages(selectedBook.id);
    } catch (err) {
      showMessage("Failed to update page");
    }
  };

  const handleDeletePage = async (pageId) => {
    if (!window.confirm("Delete this page?")) return;
    try {
      await axios.delete(`${API}/page/${pageId}`);
      showMessage("Page deleted!");
      await fetchBookPages(selectedBook.id);
    } catch (err) {
      showMessage("Failed to delete page");
    }
  };

  const startEditingPage = (page) => {
    const fmt = parseFormatJson(page.format);
    setEditingPage({
      ...page,
      _fontFamily: fmt.fontFamily,
      _fontSize: fmt.fontSize,
      _color: fmt.color,
      _layout: fmt.layout || {},
    });
  };

  const updateEditFormat = (key, value) => {
    setEditingPage((prev) => {
      const updated = { ...prev, [key]: value };
      updated.format = buildFormatJson(
        updated._fontFamily,
        updated._fontSize,
        updated._color,
        updated._layout
      );
      return updated;
    });
  };

  // Render the image upload area
  const renderImageUpload = (label, url, setUrl, uploading, setUploading, inputId) => (
    <div className="bm-upload-area">
      <label className="bm-upload-label">{label}</label>
      {url ? (
        <div className="bm-upload-preview">
          <img src={resolveImageUrl(url)} alt={label} className="bm-upload-thumb" />
          <button
            className="bm-btn bm-btn-delete bm-btn-sm"
            onClick={() => setUrl("")}
            type="button"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="bm-upload-controls">
          <input
            type="file"
            accept="image/*"
            id={inputId}
            className="bm-file-input"
            onChange={(e) => {
              if (e.target.files[0]) {
                handleUpload(e.target.files[0], setUrl, setUploading);
              }
            }}
          />
          <label htmlFor={inputId} className="bm-btn bm-btn-edit bm-btn-sm">
            Choose File
          </label>
          {uploading && <span className="bm-uploading">Uploading...</span>}
        </div>
      )}
    </div>
  );

  // Render formatting toolbar
  const renderFormatToolbar = (family, setFamily, size, setSize, color, setColor) => (
    <div className="bm-format-toolbar">
      <label className="bm-format-label">Text Formatting</label>
      <div className="bm-format-controls">
        <select
          value={family}
          onChange={(e) => setFamily(e.target.value)}
          className="bm-format-select"
          aria-label="Font family"
        >
          <option value="sans-serif">Sans-serif</option>
          <option value="serif">Serif</option>
          <option value="monospace">Monospace</option>
          <option value="cursive">Cursive</option>
        </select>
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="bm-format-select"
          aria-label="Font size"
        >
          <option value="12px">12px</option>
          <option value="14px">14px</option>
          <option value="16px">16px</option>
          <option value="18px">18px</option>
          <option value="20px">20px</option>
          <option value="24px">24px</option>
          <option value="28px">28px</option>
          <option value="32px">32px</option>
          <option value="36px">36px</option>
        </select>
        <div className="bm-color-picker-wrap">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="bm-color-picker"
            aria-label="Font color"
          />
          <span className="bm-color-label">{color}</span>
        </div>
      </div>
    </div>
  );

  // Main menu
  if (view === "menu") {
    return (
      <div className="book-manager">
        <h1>Book Manager</h1>
        {message && <div className="bm-message">{message}</div>}
        <div className="bm-button-row">
          <button className="bm-btn bm-btn-create" onClick={() => setView("create")}>
            Create New Book
          </button>
          <button className="bm-btn bm-btn-draft" onClick={() => { fetchDrafts(); setView("drafts"); }}>
            My Drafts
          </button>
          <button className="bm-btn bm-btn-all" onClick={() => { fetchBooks(); setView("allbooks"); }}>
            All My Books
          </button>
        </div>
      </div>
    );
  }

  // Create new book
  if (view === "create") {
    return (
      <div className="book-manager">
        <h1>Create New Book</h1>
        {message && <div className="bm-message">{message}</div>}
        <div className="bm-form">
          <input
            type="text"
            placeholder="Enter book title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="bm-input"
          />
          <button className="bm-btn bm-btn-create" onClick={handleCreateBook} disabled={loading}>
            {loading ? "Creating..." : "Create Book"}
          </button>
          <button className="bm-btn bm-btn-back" onClick={() => setView("menu")}>Back</button>
        </div>
      </div>
    );
  }

  // Drafts list
  if (view === "drafts") {
    return (
      <div className="book-manager">
        <h1>My Drafts</h1>
        {message && <div className="bm-message">{message}</div>}
        {loading ? <p>Loading...</p> : (
          <div className="bm-book-list">
            {books.length === 0 && <p>No drafts found.</p>}
            {books.map((book) => (
              <div key={book.id} className="bm-book-card">
                <div className="bm-book-info">
                  <h3>{book.title}</h3>
                  <span className="bm-status bm-status-draft">DRAFT</span>
                  <p className="bm-date">Modified: {book.modifiedDate}</p>
                </div>
                <div className="bm-book-actions">
                  <button className="bm-btn bm-btn-edit" onClick={() => handleEditBook(book)}>Edit</button>
                  <button className="bm-btn bm-btn-delete" onClick={() => handleDeleteBook(book.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <button className="bm-btn bm-btn-back" onClick={() => setView("menu")}>Back</button>
      </div>
    );
  }

  // All books list
  if (view === "allbooks") {
    return (
      <div className="book-manager">
        <h1>All My Books</h1>
        {message && <div className="bm-message">{message}</div>}
        {loading ? <p>Loading...</p> : (
          <div className="bm-book-list">
            {books.length === 0 && <p>No books found.</p>}
            {books.map((book) => (
              <div key={book.id} className="bm-book-card">
                <div className="bm-book-info">
                  <h3>{book.title}</h3>
                  <span className={`bm-status ${book.status === "PUBLISHED" ? "bm-status-published" : "bm-status-draft"}`}>
                    {book.status}
                  </span>
                  <p className="bm-date">Modified: {book.modifiedDate}</p>
                </div>
                <div className="bm-book-actions">
                  <button className="bm-btn bm-btn-edit" onClick={() => handleEditBook(book)}>Edit</button>
                  <button className="bm-btn bm-btn-preview" onClick={() => { setSelectedBook(book); setView("preview"); }}>Preview</button>
                  <button className="bm-btn bm-btn-delete" onClick={() => handleDeleteBook(book.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <button className="bm-btn bm-btn-back" onClick={() => setView("menu")}>Back</button>
      </div>
    );
  }

  // Edit book
  if (view === "edit") {
    return (
      <div className="book-manager">
        <h1>Edit Book</h1>
        {message && <div className="bm-message">{message}</div>}

        {selectedBook && (
          <div className="bm-edit-section">
            {/* Book details */}
            <div className="bm-edit-header">
              <input
                type="text"
                value={selectedBook.title}
                onChange={(e) => setSelectedBook({ ...selectedBook, title: e.target.value })}
                className="bm-input bm-input-title"
              />
              <button className="bm-btn bm-btn-edit" onClick={handleUpdateTitle}>Save Title</button>
              <span className={`bm-status ${selectedBook.status === "PUBLISHED" ? "bm-status-published" : "bm-status-draft"}`}>
                {selectedBook.status}
              </span>
            </div>

            <div className="bm-action-bar">
              <button className="bm-btn bm-btn-draft" onClick={handleSaveDraft}>Save as Draft</button>
              <button className="bm-btn bm-btn-create" onClick={handlePublish}>Publish</button>
              <button className="bm-btn bm-btn-preview" onClick={() => setView("preview")}>Preview</button>
              <button className="bm-btn bm-btn-delete" onClick={() => handleDeleteBook(selectedBook.id)}>Delete Book</button>
            </div>

            {/* Add page form */}
            <div className="bm-add-page">
              <h3>Add New Page</h3>
              <div className="bm-page-form-grid">
                <div className="bm-form-row">
                  <input type="number" placeholder="Page #" value={pageNumber}
                    onChange={(e) => setPageNumber(e.target.value)} className="bm-input bm-input-small" />
                  <textarea placeholder="Page content..." value={pageContent}
                    onChange={(e) => setPageContent(e.target.value)} className="bm-input bm-textarea" rows={3} />
                </div>

                {renderFormatToolbar(
                  formatFontFamily, setFormatFontFamily,
                  formatFontSize, setFormatFontSize,
                  formatColor, setFormatColor
                )}

                <div className="bm-upload-row">
                  {renderImageUpload("Image 1", pageImageUrl, setPageImageUrl, uploading1, setUploading1, "add-img1")}
                  {renderImageUpload("Image 2", pageImageUrl2, setPageImageUrl2, uploading2, setUploading2, "add-img2")}
                </div>

                {(pageImageUrl || pageImageUrl2) && (
                  <PageLayoutEditor
                    imageUrl={pageImageUrl}
                    imageUrl2={pageImageUrl2}
                    content={pageContent}
                    textStyle={{ fontFamily: formatFontFamily, fontSize: formatFontSize, color: formatColor }}
                    layout={pageLayout}
                    onLayoutChange={setPageLayout}
                  />
                )}

                <button className="bm-btn bm-btn-create" onClick={handleAddPage}>Add Page</button>
              </div>
            </div>

            {/* Pages list */}
            <div className="bm-pages-list">
              <h3>Pages ({pages.length})</h3>
              {pages.map((page) => (
                <div key={page.id} className="bm-page-card">
                  {editingPage && editingPage.id === page.id ? (
                    <div className="bm-page-edit-form">
                      <div className="bm-form-row">
                        <input type="number" value={editingPage.pageNumber}
                          onChange={(e) => setEditingPage({ ...editingPage, pageNumber: parseInt(e.target.value) })}
                          className="bm-input bm-input-small" />
                        <textarea value={editingPage.content || ""}
                          onChange={(e) => setEditingPage({ ...editingPage, content: e.target.value })}
                          className="bm-input bm-textarea" placeholder="Content" rows={3} />
                      </div>

                      {renderFormatToolbar(
                        editingPage._fontFamily,
                        (val) => updateEditFormat("_fontFamily", val),
                        editingPage._fontSize,
                        (val) => updateEditFormat("_fontSize", val),
                        editingPage._color,
                        (val) => updateEditFormat("_color", val)
                      )}

                      <div className="bm-upload-row">
                        {renderImageUpload(
                          "Image 1",
                          editingPage.imageUrl,
                          (url) => setEditingPage((p) => ({ ...p, imageUrl: url })),
                          editUploading1,
                          setEditUploading1,
                          "edit-img1"
                        )}
                        {renderImageUpload(
                          "Image 2",
                          editingPage.imageUrl2,
                          (url) => setEditingPage((p) => ({ ...p, imageUrl2: url })),
                          editUploading2,
                          setEditUploading2,
                          "edit-img2"
                        )}
                      </div>

                      {(editingPage.imageUrl || editingPage.imageUrl2) && (
                        <PageLayoutEditor
                          imageUrl={editingPage.imageUrl}
                          imageUrl2={editingPage.imageUrl2}
                          content={editingPage.content}
                          textStyle={{ fontFamily: editingPage._fontFamily, fontSize: editingPage._fontSize, color: editingPage._color }}
                          layout={editingPage._layout}
                          onLayoutChange={(l) => updateEditFormat("_layout", l)}
                        />
                      )}

                      <div className="bm-page-actions">
                        <button className="bm-btn bm-btn-create" onClick={handleUpdatePage}>Save</button>
                        <button className="bm-btn bm-btn-back" onClick={() => setEditingPage(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="bm-page-display">
                      <span className="bm-page-num">#{page.pageNumber}</span>
                      <span className="bm-page-content">{page.content || "(empty)"}</span>
                      {page.imageUrl && (
                        <img src={resolveImageUrl(page.imageUrl)} alt="img1" className="bm-page-thumb" />
                      )}
                      {page.imageUrl2 && (
                        <img src={resolveImageUrl(page.imageUrl2)} alt="img2" className="bm-page-thumb" />
                      )}
                      <div className="bm-page-actions">
                        <button className="bm-btn bm-btn-edit" onClick={() => startEditingPage(page)}>Edit</button>
                        <button className="bm-btn bm-btn-delete" onClick={() => handleDeletePage(page.id)}>Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <button className="bm-btn bm-btn-back" onClick={() => setView("menu")} style={{ marginTop: "20px" }}>
          Back to Menu
        </button>
      </div>
    );
  }

  // Preview
  if (view === "preview" && selectedBook) {
    return (
      <div className="book-manager">
        <h1>Preview: {selectedBook.title}</h1>
        <FlipBook bookId={selectedBook.id} />
        <button className="bm-btn bm-btn-back" onClick={() => setView("edit")} style={{ marginTop: "20px" }}>
          Back to Edit
        </button>
        <button className="bm-btn bm-btn-back" onClick={() => setView("menu")} style={{ marginTop: "20px", marginLeft: "10px" }}>
          Back to Menu
        </button>
      </div>
    );
  }

  return null;
}

export default BookManager;
