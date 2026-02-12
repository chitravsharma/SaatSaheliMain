import React, { useState } from "react";
import axios from "axios";
import FlipBook from "../FlipBook";
import PageLayoutEditor from "../PageLayoutEditor";
import strings from "../constants/strings";
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
      showMessage(strings.bookManager.msgImageUploaded);
    } catch (err) {
      showMessage(strings.bookManager.msgUploadFailed(err.response?.data?.error || err.message));
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
      showMessage(strings.bookManager.msgEnterTitle);
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post(`${API}/create`, { title: newTitle, userId: 1 });
      setSelectedBook(res.data);
      setPages(res.data.pages || []);
      setNewTitle("");
      showMessage(strings.bookManager.msgBookCreated);
      setView("edit");
    } catch (err) {
      showMessage(strings.bookManager.msgCreateFailed(err.response?.data?.error || err.message));
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
      showMessage(strings.bookManager.msgTitleUpdated);
    } catch (err) {
      showMessage(strings.bookManager.msgTitleFailed);
    }
  };

  const handlePublish = async () => {
    if (!selectedBook) return;
    try {
      const res = await axios.put(`${API}/${selectedBook.id}/publish`);
      setSelectedBook(res.data);
      showMessage(strings.bookManager.msgPublished);
    } catch (err) {
      showMessage(strings.bookManager.msgPublishFailed);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedBook) return;
    try {
      const res = await axios.put(`${API}/${selectedBook.id}/draft`);
      setSelectedBook(res.data);
      showMessage(strings.bookManager.msgDraftSaved);
    } catch (err) {
      showMessage(strings.bookManager.msgDraftFailed);
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (!window.confirm(strings.bookManager.confirmDeleteBook)) return;
    try {
      await axios.delete(`${API}/${bookId}`);
      showMessage(strings.bookManager.msgBookDeleted);
      setSelectedBook(null);
      setPages([]);
      setView("menu");
    } catch (err) {
      showMessage(strings.bookManager.msgDeleteBookFailed);
    }
  };

  const handleAddPage = async () => {
    if (!selectedBook) return;
    if (!pageNumber) {
      showMessage(strings.bookManager.msgPageNumberRequired);
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
      showMessage(strings.bookManager.msgPageAdded);
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
      showMessage(strings.bookManager.msgAddPageFailed);
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
      showMessage(strings.bookManager.msgPageUpdated);
      setEditingPage(null);
      await fetchBookPages(selectedBook.id);
    } catch (err) {
      showMessage(strings.bookManager.msgUpdatePageFailed);
    }
  };

  const handleDeletePage = async (pageId) => {
    if (!window.confirm(strings.bookManager.confirmDeletePage)) return;
    try {
      await axios.delete(`${API}/page/${pageId}`);
      showMessage(strings.bookManager.msgPageDeleted);
      await fetchBookPages(selectedBook.id);
    } catch (err) {
      showMessage(strings.bookManager.msgDeletePageFailed);
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
            {strings.common.remove}
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
            {strings.bookManager.chooseFile}
          </label>
          {uploading && <span className="bm-uploading">{strings.bookManager.uploading}</span>}
        </div>
      )}
    </div>
  );

  // Render formatting toolbar
  const renderFormatToolbar = (family, setFamily, size, setSize, color, setColor) => (
    <div className="bm-format-toolbar">
      <label className="bm-format-label">{strings.bookManager.textFormatting}</label>
      <div className="bm-format-controls">
        <select
          value={family}
          onChange={(e) => setFamily(e.target.value)}
          className="bm-format-select"
          aria-label={strings.bookManager.ariaFontFamily}
        >
          <option value="sans-serif">{strings.bookManager.fontSans}</option>
          <option value="serif">{strings.bookManager.fontSerif}</option>
          <option value="monospace">{strings.bookManager.fontMono}</option>
          <option value="cursive">{strings.bookManager.fontCursive}</option>
        </select>
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="bm-format-select"
          aria-label={strings.bookManager.ariaFontSize}
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
            aria-label={strings.bookManager.ariaFontColor}
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
        <h1>{strings.bookManager.heading}</h1>
        {message && <div className="bm-message">{message}</div>}
        <div className="bm-button-row">
          <button className="bm-btn bm-btn-create" onClick={() => setView("create")}>
            {strings.bookManager.createNewBook}
          </button>
          <button className="bm-btn bm-btn-draft" onClick={() => { fetchDrafts(); setView("drafts"); }}>
            {strings.bookManager.myDrafts}
          </button>
          <button className="bm-btn bm-btn-all" onClick={() => { fetchBooks(); setView("allbooks"); }}>
            {strings.bookManager.allMyBooks}
          </button>
        </div>
      </div>
    );
  }

  // Create new book
  if (view === "create") {
    return (
      <div className="book-manager">
        <h1>{strings.bookManager.createHeading}</h1>
        {message && <div className="bm-message">{message}</div>}
        <div className="bm-form">
          <input
            type="text"
            placeholder={strings.bookManager.placeholderTitle}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="bm-input"
          />
          <button className="bm-btn bm-btn-create" onClick={handleCreateBook} disabled={loading}>
            {loading ? strings.bookManager.creating : strings.bookManager.createButton}
          </button>
          <button className="bm-btn bm-btn-back" onClick={() => setView("menu")}>{strings.common.back}</button>
        </div>
      </div>
    );
  }

  // Drafts list
  if (view === "drafts") {
    return (
      <div className="book-manager">
        <h1>{strings.bookManager.draftsHeading}</h1>
        {message && <div className="bm-message">{message}</div>}
        {loading ? <p>{strings.common.loading}</p> : (
          <div className="bm-book-list">
            {books.length === 0 && <p>{strings.bookManager.noDrafts}</p>}
            {books.map((book) => (
              <div key={book.id} className="bm-book-card">
                <div className="bm-book-info">
                  <h3>{book.title}</h3>
                  <span className="bm-status bm-status-draft">DRAFT</span>
                  <p className="bm-date">{strings.bookManager.modified}{book.modifiedDate}</p>
                </div>
                <div className="bm-book-actions">
                  <button className="bm-btn bm-btn-edit" onClick={() => handleEditBook(book)}>{strings.common.edit}</button>
                  <button className="bm-btn bm-btn-delete" onClick={() => handleDeleteBook(book.id)}>{strings.common.delete}</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <button className="bm-btn bm-btn-back" onClick={() => setView("menu")}>{strings.common.back}</button>
      </div>
    );
  }

  // All books list
  if (view === "allbooks") {
    return (
      <div className="book-manager">
        <h1>{strings.bookManager.allBooksHeading}</h1>
        {message && <div className="bm-message">{message}</div>}
        {loading ? <p>{strings.common.loading}</p> : (
          <div className="bm-book-list">
            {books.length === 0 && <p>{strings.bookManager.noBooks}</p>}
            {books.map((book) => (
              <div key={book.id} className="bm-book-card">
                <div className="bm-book-info">
                  <h3>{book.title}</h3>
                  <span className={`bm-status ${book.status === "PUBLISHED" ? "bm-status-published" : "bm-status-draft"}`}>
                    {book.status}
                  </span>
                  <p className="bm-date">{strings.bookManager.modified}{book.modifiedDate}</p>
                </div>
                <div className="bm-book-actions">
                  <button className="bm-btn bm-btn-edit" onClick={() => handleEditBook(book)}>{strings.common.edit}</button>
                  <button className="bm-btn bm-btn-preview" onClick={() => { setSelectedBook(book); setView("preview"); }}>{strings.bookManager.preview}</button>
                  <button className="bm-btn bm-btn-delete" onClick={() => handleDeleteBook(book.id)}>{strings.common.delete}</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <button className="bm-btn bm-btn-back" onClick={() => setView("menu")}>{strings.common.back}</button>
      </div>
    );
  }

  // Edit book
  if (view === "edit") {
    return (
      <div className="book-manager">
        <h1>{strings.bookManager.editHeading}</h1>
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
              <button className="bm-btn bm-btn-edit" onClick={handleUpdateTitle}>{strings.bookManager.saveTitle}</button>
              <span className={`bm-status ${selectedBook.status === "PUBLISHED" ? "bm-status-published" : "bm-status-draft"}`}>
                {selectedBook.status}
              </span>
            </div>

            <div className="bm-action-bar">
              <button className="bm-btn bm-btn-draft" onClick={handleSaveDraft}>{strings.bookManager.saveAsDraft}</button>
              <button className="bm-btn bm-btn-create" onClick={handlePublish}>{strings.bookManager.publish}</button>
              <button className="bm-btn bm-btn-preview" onClick={() => setView("preview")}>{strings.bookManager.preview}</button>
              <button className="bm-btn bm-btn-delete" onClick={() => handleDeleteBook(selectedBook.id)}>{strings.bookManager.deleteBook}</button>
            </div>

            {/* Add page form */}
            <div className="bm-add-page">
              <h3>{strings.bookManager.addNewPage}</h3>
              <div className="bm-page-form-grid">
                <div className="bm-form-row">
                  <input type="number" placeholder={strings.bookManager.placeholderPageNumber} value={pageNumber}
                    onChange={(e) => setPageNumber(e.target.value)} className="bm-input bm-input-small" />
                  <textarea placeholder={strings.bookManager.placeholderContent} value={pageContent}
                    onChange={(e) => setPageContent(e.target.value)} className="bm-input bm-textarea" rows={3} />
                </div>

                {renderFormatToolbar(
                  formatFontFamily, setFormatFontFamily,
                  formatFontSize, setFormatFontSize,
                  formatColor, setFormatColor
                )}

                <div className="bm-upload-row">
                  {renderImageUpload(strings.bookManager.image1Label, pageImageUrl, setPageImageUrl, uploading1, setUploading1, "add-img1")}
                  {renderImageUpload(strings.bookManager.image2Label, pageImageUrl2, setPageImageUrl2, uploading2, setUploading2, "add-img2")}
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

                <button className="bm-btn bm-btn-create" onClick={handleAddPage}>{strings.bookManager.addPage}</button>
              </div>
            </div>

            {/* Pages list */}
            <div className="bm-pages-list">
              <h3>{strings.bookManager.pagesCount(pages.length)}</h3>
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
                          className="bm-input bm-textarea" placeholder={strings.bookManager.placeholderEditContent} rows={3} />
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
                          strings.bookManager.image1Label,
                          editingPage.imageUrl,
                          (url) => setEditingPage((p) => ({ ...p, imageUrl: url })),
                          editUploading1,
                          setEditUploading1,
                          "edit-img1"
                        )}
                        {renderImageUpload(
                          strings.bookManager.image2Label,
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
                        <button className="bm-btn bm-btn-create" onClick={handleUpdatePage}>{strings.common.save}</button>
                        <button className="bm-btn bm-btn-back" onClick={() => setEditingPage(null)}>{strings.common.cancel}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="bm-page-display">
                      <span className="bm-page-num">#{page.pageNumber}</span>
                      <span className="bm-page-content">{page.content || strings.bookManager.emptyPage}</span>
                      {page.imageUrl && (
                        <img src={resolveImageUrl(page.imageUrl)} alt={strings.bookManager.image1Alt} className="bm-page-thumb" />
                      )}
                      {page.imageUrl2 && (
                        <img src={resolveImageUrl(page.imageUrl2)} alt={strings.bookManager.image2Alt} className="bm-page-thumb" />
                      )}
                      <div className="bm-page-actions">
                        <button className="bm-btn bm-btn-edit" onClick={() => startEditingPage(page)}>{strings.common.edit}</button>
                        <button className="bm-btn bm-btn-delete" onClick={() => handleDeletePage(page.id)}>{strings.common.delete}</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <button className="bm-btn bm-btn-back" onClick={() => setView("menu")} style={{ marginTop: "20px" }}>
          {strings.bookManager.backToMenu}
        </button>
      </div>
    );
  }

  // Preview
  if (view === "preview" && selectedBook) {
    return (
      <div className="book-manager">
        <h1>{strings.bookManager.previewHeading(selectedBook.title)}</h1>
        <FlipBook bookId={selectedBook.id} />
        <button className="bm-btn bm-btn-back" onClick={() => setView("edit")} style={{ marginTop: "20px" }}>
          {strings.bookManager.backToEdit}
        </button>
        <button className="bm-btn bm-btn-back" onClick={() => setView("menu")} style={{ marginTop: "20px", marginLeft: "10px" }}>
          {strings.bookManager.backToMenu}
        </button>
      </div>
    );
  }

  return null;
}

export default BookManager;
