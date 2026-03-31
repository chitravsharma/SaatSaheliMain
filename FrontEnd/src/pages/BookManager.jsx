import React, { useState, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import FlipBook from "../FlipBook";
import PageLayoutEditor from "../PageLayoutEditor";
import CoverPageDesigner from "../components/CoverPageDesigner";
import { useAuth } from "../AuthContext";
import { useStrings } from "../LanguageContext";
import TermsGate from "../components/TermsGate";
import "../BookManager.css";

const API = `${process.env.REACT_APP_API_URL}/api/books`;
const UPLOAD_API = `${process.env.REACT_APP_API_URL}/api/upload`;
const GENERATE_API = `${process.env.REACT_APP_API_URL}/api/generate-image`;

// Public books browser shown when no user is logged in
function PublicBooks() {
  const strings = useStrings();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [readingBookId, setReadingBookId] = useState(null);

  useEffect(() => {
    const fetchPublished = async () => {
      try {
        const res = await axios.get(`${API}/search?status=PUBLISHED`);
        setBooks(Array.isArray(res.data) ? res.data : []);
      } catch {
        setError(strings.publicBooks.error);
      } finally {
        setLoading(false);
      }
    };
    fetchPublished();
  }, []);

  if (readingBookId) {
    const currentIndex = books.findIndex((b) => b.id === readingBookId);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < books.length - 1;

    return (
      <div className="book-manager">
        <div className="bm-reader-nav">
          <button className="bm-btn bm-btn-back" onClick={() => setReadingBookId(null)}>
            {strings.publicBooks.backToBooks}
          </button>
          <button
            className="bm-btn bm-btn-back"
            disabled={!hasPrev}
            onClick={() => hasPrev && setReadingBookId(books[currentIndex - 1].id)}
          >
            {strings.readBook.prevBook}
          </button>
          <button
            className="bm-btn bm-btn-back"
            disabled={!hasNext}
            onClick={() => hasNext && setReadingBookId(books[currentIndex + 1].id)}
          >
            {strings.readBook.nextBook}
          </button>
        </div>
        <FlipBook bookId={readingBookId} />
      </div>
    );
  }

  return (
    <div className="book-manager">
      <h1>{strings.publicBooks.heading}</h1>
      <p className="bm-public-hint">
        <Link to="/Login">{strings.publicBooks.loginPrompt}</Link>
      </p>

      <div className="bm-section-card">
      {loading && <p>{strings.publicBooks.loading}</p>}
      {error && <p className="bm-message">{error}</p>}

      {!loading && !error && books.length === 0 && (
        <p>{strings.publicBooks.emptyState}</p>
      )}

      {!loading && !error && books.length > 0 && (
        <div className="bm-books-row">
          {books.map((book) => (
            <div key={book.id} className="bm-book-card">
              <button className="bm-book-card-link" onClick={() => setReadingBookId(book.id)} aria-label={`Read ${book.title}`}>
                <div className="bm-book-cover">
                  {book.coverImageUrl ? (
                    <img src={resolveImageUrl(book.coverImageUrl)} alt={book.title} className="bm-book-cover-img" />
                  ) : (
                    <span className="bm-book-cover-title">{book.title}</span>
                  )}
                </div>
                <div className="bm-book-info">
                  <span className="bm-book-title">{book.title}</span>
                  {book.authorName && (
                    <span className="bm-book-author">by {book.authorName}</span>
                  )}
                </div>
              </button>
            </div>
          ))}
        </div>
      )}
      </div>{/* end bm-section-card */}
    </div>
  );
}

// Helper to resolve image URL (supports local uploads and Drive URLs)
function resolveImageUrl(url) {
  if (!url) return url;
  // Local upload path
  if (url.startsWith("/uploads/")) {
    return `${process.env.REACT_APP_API_URL}${url}`;
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
  const { user, isSuperAdmin, isPremiumOrAbove } = useAuth();
  const canCustomizeCover = isSuperAdmin || isPremiumOrAbove;
  const strings = useStrings();
  const location = useLocation();
  const bmNavigate = useNavigate();
  const userId = user?.userId || 1;
  const [view, setView] = useState("menu");
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [pages, setPages] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [publishedBooks, setPublishedBooks] = useState([]);
  const [publishedLoading, setPublishedLoading] = useState(true);
  const [readingBookId, setReadingBookId] = useState(null);
  const [docFile, setDocFile] = useState(null);
  const [docUploading, setDocUploading] = useState(false);

  // Fetch published books for the menu view
  useEffect(() => {
    if (!user) return;
    const fetchPublished = async () => {
      try {
        const res = await axios.get(`${API}/search?status=PUBLISHED&userId=${userId}`);
        setPublishedBooks(Array.isArray(res.data) ? res.data : []);
      } catch {
        setPublishedBooks([]);
      } finally {
        setPublishedLoading(false);
      }
    };
    fetchPublished();
  }, [user, userId]);

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

  // AI generation state
  const [generating1, setGenerating1] = useState(false);
  const [generating2, setGenerating2] = useState(false);
  const [editGenerating1, setEditGenerating1] = useState(false);
  const [editGenerating2, setEditGenerating2] = useState(false);
  const [imageStyle, setImageStyle] = useState("general");

  // Cover/Back page designer state
  const [coverDesignData, setCoverDesignData] = useState({});

  // Help & Support state
  const [showHelp, setShowHelp] = useState(false);

  // Helper: detect if a page number is the back page (last page in the book)
  const getBackPageNumber = () => {
    if (pages.length === 0) return 50;
    return pages[pages.length - 1]?.pageNumber || 50;
  };
  const isCoverPage = (num) => parseInt(num) === 1;
  const isBackPage = (num) => {
    const n = parseInt(num);
    return n === getBackPageNumber() || n === 50 || n === 99;
  };
  const isCoverOrBack = (num) => isCoverPage(num) || isBackPage(num);

  // Open book for editing when navigated from Account page
  useEffect(() => {
    const editBookId = location.state?.editBookId;
    if (editBookId) {
      const openBook = async () => {
        try {
          const res = await axios.get(`${API}/${editBookId}`);
          setSelectedBook(res.data);
          const pagesRes = await axios.get(`${API}/${editBookId}/pages`);
          setPages(Array.isArray(pagesRes.data) ? pagesRes.data : []);
          setView("edit");
        } catch {
          // fall back to menu if book not found
        }
      };
      openBook();
      // Clear the state so refreshing doesn't re-trigger
      window.history.replaceState({}, "");
    }
  }, [location.state]);

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

  const handleGenerateImage = async (content, setUrl, setGeneratingState) => {
    const prompt = window.prompt(strings.bookManager.aiPromptDialog, content?.trim() || "");
    if (prompt === null) return; // user cancelled
    if (!prompt.trim()) {
      showMessage(strings.bookManager.msgEmptyContentForAI);
      return;
    }
    setGeneratingState(true);
    try {
      const res = await axios.post(GENERATE_API, { prompt: prompt.trim(), style: imageStyle }, { timeout: 90000 });
      setUrl(res.data.url);
      showMessage(strings.bookManager.msgImageGenerated);
    } catch (err) {
      showMessage(strings.bookManager.msgGenerateFailed(err.response?.data?.error || err.message));
    } finally {
      setGeneratingState(false);
    }
  };

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/user/${userId}`);
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
      const res = await axios.get(`${API}/user/${userId}/drafts`);
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
      const res = await axios.post(`${API}/create`, { title: newTitle, userId });
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
      const res = await axios.put(`${API}/${selectedBook.id}`, { title: selectedBook.title, userId: String(userId) });
      setSelectedBook(res.data);
      showMessage(strings.bookManager.msgTitleUpdated);
    } catch (err) {
      showMessage(strings.bookManager.msgTitleFailed);
    }
  };

  const handlePublish = async () => {
    if (!selectedBook) return;
    try {
      const res = await axios.put(`${API}/${selectedBook.id}/publish?userId=${userId}`);
      setSelectedBook(res.data);
      showMessage(strings.bookManager.msgPublished);
    } catch (err) {
      showMessage(strings.bookManager.msgPublishFailed);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedBook) return;
    try {
      const res = await axios.put(`${API}/${selectedBook.id}/draft?userId=${userId}`);
      setSelectedBook(res.data);
      showMessage(strings.bookManager.msgDraftSaved);
    } catch (err) {
      showMessage(strings.bookManager.msgDraftFailed);
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (!window.confirm(strings.bookManager.confirmDeleteBook)) return;
    try {
      await axios.delete(`${API}/${bookId}?userId=${userId}`);
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
      const isSpecialPage = isCoverOrBack(pageNumber);
      const formatJson = isSpecialPage
        ? JSON.stringify({ fontFamily: "sans-serif", fontSize: "16px", color: "#1a1a2e", coverDesign: coverDesignData, layout: {} })
        : buildFormatJson(formatFontFamily, formatFontSize, formatColor, pageLayout);
      await axios.post(`${API}/${selectedBook.id}/page?userId=${userId}`, {
        pageNumber: parseInt(pageNumber),
        content: pageContent,
        format: formatJson,
        imageUrl: pageImageUrl,
        imageUrl2: isSpecialPage ? "" : pageImageUrl2,
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
      setCoverDesignData({});
      await fetchBookPages(selectedBook.id);
    } catch (err) {
      showMessage(strings.bookManager.msgAddPageFailed);
    }
  };

  const handleUpdatePage = async () => {
    if (!editingPage) return;
    try {
      await axios.put(`${API}/page/${editingPage.id}?userId=${userId}`, {
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
      await axios.delete(`${API}/page/${pageId}?userId=${userId}`);
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
  const renderImageUpload = (label, url, setUrl, uploading, setUploading, inputId, contentForAI, generating, setGenerating) => (
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
          {contentForAI !== undefined && (
            <div className="bm-ai-controls">
              <select
                className="bm-format-select"
                value={imageStyle}
                onChange={(e) => setImageStyle(e.target.value)}
                aria-label={strings.bookManager.imageStyleLabel}
              >
                {strings.bookManager.imageStyles.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <button
                className="bm-btn bm-btn-ai bm-btn-sm"
                type="button"
                disabled={generating || uploading}
                onClick={() => handleGenerateImage(contentForAI, setUrl, setGenerating)}
              >
                {generating ? strings.bookManager.generatingImage : strings.bookManager.createWithAI}
              </button>
            </div>
          )}
          {uploading && <span className="bm-uploading">{strings.bookManager.uploading}</span>}
          {generating && <span className="bm-uploading">{strings.bookManager.generatingImage}</span>}
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

  // Show public books browser if not logged in
  if (!user) return <PublicBooks />;

  const wrappedContent = (() => {
  // Main menu
  if (view === "menu") {
    const isReading = !!readingBookId;
    return (
      <div className={`book-manager ${isReading ? "bm-layout-reading" : ""}`}>
        <div className={isReading ? "bm-sidebar" : ""}>
          <h1>{strings.bookManager.heading}</h1>
          {message && <div className="bm-message">{message}</div>}
          <div className="bm-section-card">
          <div className={`bm-button-row ${isReading ? "bm-button-col" : ""}`}>
            <button className="bm-btn bm-btn-create" onClick={() => { setReadingBookId(null); setView("create"); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              {strings.bookManager.createNewBook}
            </button>
            <button className="bm-btn bm-btn-upload" onClick={() => { setReadingBookId(null); setNewTitle(""); setDocFile(null); setView("upload-doc"); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/></svg>
              {strings.bookManager.createFromDocument}
            </button>
            <button className="bm-btn bm-btn-draft" onClick={() => { setReadingBookId(null); fetchDrafts(); setView("drafts"); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              {strings.bookManager.myDrafts}
            </button>
            <button className="bm-btn bm-btn-all" onClick={() => { setReadingBookId(null); fetchBooks(); setView("allbooks"); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
              {strings.bookManager.allMyBooks}
            </button>
            <button className="bm-btn bm-btn-edit" onClick={() => bmNavigate("/articles")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              My Articles
            </button>
          </div>
          </div>{/* end bm-section-card for buttons */}

          <div className="bm-section-card">
          <h2 className="bm-published-heading">{strings.publicBooks.heading}</h2>
          {publishedLoading && <p>{strings.publicBooks.loading}</p>}
          {!publishedLoading && publishedBooks.length === 0 && (
            <p>{strings.publicBooks.emptyState}</p>
          )}
          {!publishedLoading && publishedBooks.length > 0 && (
            isReading ? (
              <div className="bm-book-btn-list">
                {publishedBooks.map((book) => (
                  <button
                    key={book.id}
                    className={`bm-btn bm-btn-book-item ${readingBookId === book.id ? "bm-btn-book-active" : ""}`}
                    onClick={() => setReadingBookId(book.id)}
                  >
                    {book.title}
                  </button>
                ))}
              </div>
            ) : (
              <div className="bm-books-row">
                {publishedBooks.map((book) => (
                  <div key={book.id} className="bm-book-card">
                    <button className="bm-book-card-link" onClick={() => setReadingBookId(book.id)} aria-label={`Read ${book.title}`}>
                      <div className="bm-book-cover">
                        {book.coverImageUrl ? (
                          <img src={resolveImageUrl(book.coverImageUrl)} alt={book.title} className="bm-book-cover-img" />
                        ) : (
                          <span className="bm-book-cover-title">{book.title}</span>
                        )}
                      </div>
                      <div className="bm-book-info">
                        <span className="bm-book-title">{book.title}</span>
                        {book.authorName && (
                          <span className="bm-book-author">by {book.authorName}</span>
                        )}
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
          </div>{/* end bm-section-card for published books */}
        </div>

        {isReading && (() => {
          const currentIndex = publishedBooks.findIndex((b) => b.id === readingBookId);
          const hasPrev = currentIndex > 0;
          const hasNext = currentIndex < publishedBooks.length - 1;
          return (
            <div className="bm-reader-main">
              <div className="bm-reader-nav">
                <button className="bm-btn bm-btn-back" onClick={() => setReadingBookId(null)}>
                  {strings.publicBooks.backToBooks}
                </button>
                <button
                  className="bm-btn bm-btn-back"
                  disabled={!hasPrev}
                  onClick={() => hasPrev && setReadingBookId(publishedBooks[currentIndex - 1].id)}
                >
                  {strings.readBook.prevBook}
                </button>
                <button
                  className="bm-btn bm-btn-back"
                  disabled={!hasNext}
                  onClick={() => hasNext && setReadingBookId(publishedBooks[currentIndex + 1].id)}
                >
                  {strings.readBook.nextBook}
                </button>
              </div>
              <FlipBook bookId={readingBookId} />
            </div>
          );
        })()}
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
          <button className="bm-btn bm-btn-help" onClick={() => setShowHelp(!showHelp)} type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Help & Support
          </button>
        </div>

        {showHelp && (
          <div className="bm-help-panel">
            <h3>How to Create a Book</h3>
            <ol>
              <li><strong>Enter a title</strong> for your book and click "Create".</li>
              <li><strong>Add pages</strong> with text, images, or AI-generated illustrations.</li>
              <li><strong>Design your cover</strong> (page 1) and back page using the Cover Designer (Premium feature).</li>
              <li><strong>Preview</strong> your book with the FlipBook viewer before publishing.</li>
              <li><strong>Publish</strong> when ready to share with the community.</li>
            </ol>
            <h3>Cover & Back Page Tips</h3>
            <ul>
              <li>Generate or upload a background image for your cover.</li>
              <li>Click "Save & Customize" to position text on the image.</li>
              <li><strong>Drag text blocks</strong> to move them to the desired position.</li>
              <li>Adjust image scale with the slider for the perfect fit.</li>
              <li>Click "Save as Cover Page Image" to save the final composite.</li>
            </ul>
            <h3>Reading Features</h3>
            <ul>
              <li>Use the <strong>Read</strong> button to have a page read aloud.</li>
              <li>Use <strong>Podcast</strong> mode to listen to the entire book continuously.</li>
            </ul>
            <p className="bm-help-contact">Need more help? Contact us at <strong>avikaventures.info@gmail.com</strong></p>
          </div>
        )}

        {/* Support / Appointment Google Form */}
        <div className="bm-support-form-section">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" style={{ verticalAlign: "middle", marginRight: 6 }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Need Help with Page Design? / पेज डिज़ाइन में मदद चाहिए?
          </h3>
          <p className="bm-support-desc">
            Request support or set up an appointment for page design help. Our team will get back to you via the details you provide.
          </p>
          <iframe
            src="https://docs.google.com/forms/d/e/1FAIpQLSesmfGqG8Wz_HrmZdTJtDCcI8sF8DIIiJTuHjZJmSjc5YMl0A/viewform?embedded=true"
            width="100%"
            height="600"
            frameBorder="0"
            marginHeight="0"
            marginWidth="0"
            title="Support & Appointment Form"
            className="bm-google-form-iframe"
          >
            Loading form...
          </iframe>
          <p className="bm-support-note">
            <em>Responses are saved to our support sheet. We'll contact you within 24-48 hours.</em>
          </p>
        </div>
      </div>
    );
  }

  // Upload document to create book
  if (view === "upload-doc") {
    const handleDocUpload = async () => {
      if (!newTitle.trim()) {
        showMessage(strings.bookManager.msgEnterTitle);
        return;
      }
      if (!docFile) {
        showMessage(strings.bookManager.msgDocUploadFailed("No file selected"));
        return;
      }
      setDocUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", docFile);
        formData.append("title", newTitle.trim());
        formData.append("userId", userId);
        const res = await axios.post(`${API}/upload-document`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const book = res.data;
        setSelectedBook(book);
        setPages(book.pages || []);
        const pageCount = (book.pages || []).length;
        showMessage(strings.bookManager.msgBookFromDoc(pageCount));
        setNewTitle("");
        setDocFile(null);
        setView("edit");
      } catch (err) {
        showMessage(strings.bookManager.msgDocUploadFailed(err.response?.data?.error || err.message));
      } finally {
        setDocUploading(false);
      }
    };

    return (
      <div className="book-manager">
        <h1>{strings.bookManager.uploadDocHeading}</h1>
        {message && <div className="bm-message">{message}</div>}
        <div className="bm-form">
          <input
            type="text"
            placeholder={strings.bookManager.placeholderTitle}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="bm-input"
          />
          <div className="bm-doc-upload-area">
            <input
              type="file"
              accept=".pdf,.docx,.doc"
              id="doc-upload-input"
              className="bm-file-input"
              onChange={(e) => {
                if (e.target.files[0]) setDocFile(e.target.files[0]);
              }}
            />
            <label htmlFor="doc-upload-input" className="bm-btn bm-btn-edit">
              {strings.bookManager.chooseFile}
            </label>
            {docFile && <span className="bm-doc-filename">{docFile.name}</span>}
          </div>
          <p className="bm-doc-hint">{strings.bookManager.uploadDocHint}</p>
          <button
            className="bm-btn bm-btn-upload"
            onClick={handleDocUpload}
            disabled={docUploading}
          >
            {docUploading ? strings.bookManager.uploadingDoc : strings.bookManager.uploadDocButton}
          </button>
          <button className="bm-btn bm-btn-back" onClick={() => setView("menu")}>
            {strings.common.back}
          </button>
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
              <button className="bm-btn bm-btn-help" onClick={() => setShowHelp(!showHelp)} type="button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Help
              </button>
            </div>

            {showHelp && (
              <div className="bm-help-panel">
                <h3>Book Editing Guide</h3>
                <ul>
                  <li><strong>Page 1</strong> is your Cover Page. Set its page number to 1 to use the Cover Designer.</li>
                  <li>The <strong>last page</strong> is your Back Page. Design it with the Back Page Designer.</li>
                  <li>Use <strong>Save & Customize</strong> to position text on cover/back page images.</li>
                  <li><strong>Drag text blocks</strong> to reposition title, author name, etc. on the cover.</li>
                  <li>Click <strong>Save as Cover/Back Page Image</strong> to save the final composite.</li>
                  <li>Use <strong>Preview</strong> to see your book as readers will see it.</li>
                </ul>
                <h3>Reading & Audio</h3>
                <ul>
                  <li>In preview or read mode, use <strong>Read</strong> to hear the current page read aloud.</li>
                  <li>Use <strong>Podcast</strong> mode to listen to the entire book continuously.</li>
                </ul>
                <p className="bm-help-contact">Questions? Contact <strong>avikaventures.info@gmail.com</strong></p>
              </div>
            )}

            {/* Add page form */}
            <div className="bm-add-page">
              <h3>{strings.bookManager.addNewPage}</h3>
              <div className="bm-page-form-grid">
                <div className="bm-form-row">
                  <input type="number" placeholder={strings.bookManager.placeholderPageNumber} value={pageNumber}
                    onChange={(e) => { setPageNumber(e.target.value); setCoverDesignData({}); }} className="bm-input bm-input-small" />
                  <textarea placeholder={strings.bookManager.placeholderContent} value={pageContent}
                    onChange={(e) => setPageContent(e.target.value)} className="bm-input bm-textarea" rows={3} />
                </div>

                {/* Show Cover/Back Page Designer for cover or back page (Premium+ or Super Admin) */}
                {pageNumber && isCoverOrBack(pageNumber) && canCustomizeCover && (
                  <CoverPageDesigner
                    type={isCoverPage(pageNumber) ? "cover" : "back"}
                    bookTitle={selectedBook?.title}
                    authorName={selectedBook?.authorName}
                    imageUrl={pageImageUrl}
                    onImageChange={setPageImageUrl}
                    onDesignDataChange={(d) => setCoverDesignData(d)}
                    initialData={coverDesignData}
                  />
                )}
                {pageNumber && isCoverOrBack(pageNumber) && !canCustomizeCover && (
                  <div className="bm-upgrade-notice" style={{ padding: "16px", background: "rgba(37,99,235,0.1)", borderRadius: "8px", border: "1px solid #2a4a6b", marginTop: "8px", color: "#94a3b8", fontSize: "0.9rem" }}>
                    <strong style={{ color: "#fbbf24" }}>Cover Page Customization</strong> is available for Premium plan and above.{" "}
                    <a href="/pricing" style={{ color: "#f59e0b", textDecoration: "underline" }}>Upgrade your plan</a> to unlock this feature.
                  </div>
                )}

                {/* Show regular page editor for non-cover/back pages */}
                {(!pageNumber || !isCoverOrBack(pageNumber)) && (
                  <>
                    {renderFormatToolbar(
                      formatFontFamily, setFormatFontFamily,
                      formatFontSize, setFormatFontSize,
                      formatColor, setFormatColor
                    )}

                    <div className="bm-upload-row">
                      {renderImageUpload(strings.bookManager.image1Label, pageImageUrl, setPageImageUrl, uploading1, setUploading1, "add-img1", pageContent, generating1, setGenerating1)}
                      {renderImageUpload(strings.bookManager.image2Label, pageImageUrl2, setPageImageUrl2, uploading2, setUploading2, "add-img2", pageContent, generating2, setGenerating2)}
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
                  </>
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

                      {/* Show Cover/Back Page Designer for cover or back page (Premium+ or Super Admin) */}
                      {isCoverOrBack(editingPage.pageNumber) && canCustomizeCover ? (
                        <CoverPageDesigner
                          type={isCoverPage(editingPage.pageNumber) ? "cover" : "back"}
                          bookTitle={selectedBook?.title}
                          authorName={selectedBook?.authorName}
                          imageUrl={editingPage.imageUrl}
                          onImageChange={(url) => setEditingPage((p) => ({ ...p, imageUrl: url }))}
                          onDesignDataChange={(d) => {
                            setEditingPage((p) => {
                              let existing = {};
                              try { existing = JSON.parse(p.format || "{}"); } catch { /* not JSON */ }
                              return { ...p, format: JSON.stringify({ ...existing, coverDesign: d }) };
                            });
                          }}
                          initialData={(() => {
                            try { return JSON.parse(editingPage.format).coverDesign || {}; } catch { return {}; }
                          })()}
                        />
                      ) : isCoverOrBack(editingPage.pageNumber) && !canCustomizeCover ? (
                        <div className="bm-upgrade-notice" style={{ padding: "16px", background: "rgba(37,99,235,0.1)", borderRadius: "8px", border: "1px solid #2a4a6b", marginTop: "8px", color: "#94a3b8", fontSize: "0.9rem" }}>
                          <strong style={{ color: "#fbbf24" }}>Cover Page Customization</strong> is available for Premium plan and above.{" "}
                          <a href="/pricing" style={{ color: "#f59e0b", textDecoration: "underline" }}>Upgrade your plan</a> to unlock this feature.
                        </div>
                      ) : (
                        <>
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
                              "edit-img1",
                              editingPage.content,
                              editGenerating1,
                              setEditGenerating1
                            )}
                            {renderImageUpload(
                              strings.bookManager.image2Label,
                              editingPage.imageUrl2,
                              (url) => setEditingPage((p) => ({ ...p, imageUrl2: url })),
                              editUploading2,
                              setEditUploading2,
                              "edit-img2",
                              editingPage.content,
                              editGenerating2,
                              setEditGenerating2
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
                        </>
                      )}

                      <div className="bm-page-actions">
                        <button className="bm-btn bm-btn-create" onClick={handleUpdatePage}>{strings.common.save}</button>
                        <button className="bm-btn bm-btn-back" onClick={() => setEditingPage(null)}>{strings.common.cancel}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="bm-page-display">
                      <span className="bm-page-num">#{page.pageNumber}</span>
                      {page.pageNumber === 1 && <span className="bm-page-type-badge bm-badge-cover">Cover</span>}
                      {page.pageNumber === getBackPageNumber() && page.pageNumber !== 1 && <span className="bm-page-type-badge bm-badge-back">Back</span>}
                      <span className="bm-page-content">{page.content || strings.bookManager.emptyPage}</span>
                      {isCoverOrBack(page.pageNumber) && page.imageUrl ? (
                        <div className="bm-cover-preview" style={{ position: "relative", width: "180px", height: "240px", overflow: "hidden", borderRadius: "8px", border: "1px solid #2a4a6b" }}>
                          <img src={resolveImageUrl(page.imageUrl)} alt={strings.bookManager.image1Alt}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      ) : (
                        <>
                          {page.imageUrl && (
                            <img src={resolveImageUrl(page.imageUrl)} alt={strings.bookManager.image1Alt} className="bm-page-thumb" />
                          )}
                          {page.imageUrl2 && (
                            <img src={resolveImageUrl(page.imageUrl2)} alt={strings.bookManager.image2Alt} className="bm-page-thumb" />
                          )}
                        </>
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
        <div className="bm-preview-actions">
          <button className="bm-btn bm-btn-back" onClick={() => setView("edit")}>
            {strings.bookManager.backToEdit}
          </button>
          <button className="bm-btn bm-btn-back" onClick={() => setView("menu")}>
            {strings.bookManager.backToMenu}
          </button>
        </div>
      </div>
    );
  }

  return null;
  })();

  return <TermsGate userId={userId}>{wrappedContent}</TermsGate>;
}

export default BookManager;
