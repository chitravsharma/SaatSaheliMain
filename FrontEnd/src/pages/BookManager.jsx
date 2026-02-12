import React, { useState, useEffect } from "react";
import axios from "axios";
import FlipBook from "../FlipBook";
import "../BookManager.css";

const API = "http://localhost:8081/api/books";

function BookManager() {
  const [view, setView] = useState("menu"); // menu, create, drafts, edit, preview
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [pages, setPages] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Page form state
  const [pageContent, setPageContent] = useState("");
  const [pageNumber, setPageNumber] = useState("");
  const [pageFormat, setPageFormat] = useState("");
  const [pageImageUrl, setPageImageUrl] = useState("");
  const [editingPage, setEditingPage] = useState(null);

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/user/1`);
      setBooks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      // If no books yet, just set empty
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
      const res = await axios.post(`${API}/${selectedBook.id}/page`, {
        pageNumber: parseInt(pageNumber),
        content: pageContent,
        format: pageFormat,
        imageUrl: pageImageUrl,
      });
      showMessage("Page added!");
      setPageContent("");
      setPageNumber("");
      setPageFormat("");
      setPageImageUrl("");
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
              <div className="bm-page-form">
                <input type="number" placeholder="Page #" value={pageNumber}
                  onChange={(e) => setPageNumber(e.target.value)} className="bm-input bm-input-small" />
                <input type="text" placeholder="Content" value={pageContent}
                  onChange={(e) => setPageContent(e.target.value)} className="bm-input" />
                <input type="text" placeholder="Format (bold, italic)" value={pageFormat}
                  onChange={(e) => setPageFormat(e.target.value)} className="bm-input bm-input-small" />
                <input type="text" placeholder="Image URL" value={pageImageUrl}
                  onChange={(e) => setPageImageUrl(e.target.value)} className="bm-input" />
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
                      <input type="number" value={editingPage.pageNumber}
                        onChange={(e) => setEditingPage({ ...editingPage, pageNumber: parseInt(e.target.value) })}
                        className="bm-input bm-input-small" />
                      <input type="text" value={editingPage.content || ""}
                        onChange={(e) => setEditingPage({ ...editingPage, content: e.target.value })}
                        className="bm-input" placeholder="Content" />
                      <input type="text" value={editingPage.format || ""}
                        onChange={(e) => setEditingPage({ ...editingPage, format: e.target.value })}
                        className="bm-input bm-input-small" placeholder="Format" />
                      <input type="text" value={editingPage.imageUrl || ""}
                        onChange={(e) => setEditingPage({ ...editingPage, imageUrl: e.target.value })}
                        className="bm-input" placeholder="Image URL" />
                      <button className="bm-btn bm-btn-create" onClick={handleUpdatePage}>Save</button>
                      <button className="bm-btn bm-btn-back" onClick={() => setEditingPage(null)}>Cancel</button>
                    </div>
                  ) : (
                    <div className="bm-page-display">
                      <span className="bm-page-num">#{page.pageNumber}</span>
                      <span className="bm-page-content">{page.content || "(empty)"}</span>
                      {page.format && <span className="bm-page-format">[{page.format}]</span>}
                      <div className="bm-page-actions">
                        <button className="bm-btn bm-btn-edit" onClick={() => setEditingPage({ ...page })}>Edit</button>
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
