import React, { useEffect, useState } from "react";
import api from "./utils/api";
import { optimizeCloudinary } from "./utils/imageUrl";
import HTMLFlipBook from "react-pageflip";

const API = `${process.env.REACT_APP_API_URL}/api/books`;

function DraftBooks() {
    const [drafts, setDrafts] = useState([]);
    const [selectedBook, setSelectedBook] = useState(null);
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    // Page form fields
    const [pageNumber, setPageNumber] = useState("");
    const [content, setContent] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [imageUrl2, setImageUrl2] = useState("");
    const [format, setFormat] = useState("");

    useEffect(() => {
        fetchDrafts();
    }, []);

    const fetchDrafts = async () => {
        try {
            const res = await api.get(API);
            const unpublished = res.data.filter(b => !b.published);
            setDrafts(unpublished);
        } catch (err) {
            setMessage("Failed to load draft books.");
        }
        setLoading(false);
    };

    const handleSelectBook = async (book) => {
        setSelectedBook(book);
        setMessage("");
        try {
            const res = await api.get(`${API}/${book.id}/pages`);
            setPages(res.data);
        } catch (err) {
            setPages([]);
        }
    };

    const handleBack = () => {
        setSelectedBook(null);
        setPages([]);
        setMessage("");
        fetchDrafts();
    };

    const handlePublish = async (publish) => {
        try {
            const res = await api.put(`${API}/${selectedBook.id}/publish`, { published: publish });
            setSelectedBook(res.data);
            setMessage(publish ? "Book published!" : "Book set to draft.");
            if (publish) {
                // Remove from drafts list
                setDrafts(drafts.filter(d => d.id !== selectedBook.id));
            }
        } catch (err) {
            setMessage("Failed to update status: " + err.message);
        }
    };

    const handleAddPage = async () => {
        if (!pageNumber) return;
        try {
            const res = await api.post(`${API}/${selectedBook.id}/page`, {
                pageNumber: parseInt(pageNumber),
                content,
                imageUrl,
                imageUrl2,
                format,
            });
            setPages([...pages, res.data].sort((a, b) => a.pageNumber - b.pageNumber));
            setMessage(`Page ${res.data.pageNumber} added`);
            setPageNumber("");
            setContent("");
            setImageUrl("");
            setImageUrl2("");
            setFormat("");
        } catch (err) {
            setMessage("Failed to add page: " + err.message);
        }
    };

    // Loading state
    if (loading) return <p>Loading draft books...</p>;

    // Book detail view
    if (selectedBook) {
        return (
            <div className="add-book-container">
                <button onClick={handleBack} className="btn btn-secondary" style={{ marginBottom: "16px" }}>
                    &larr; Back to Draft Books
                </button>

                <div className="book-toolbar">
                    <h2>{selectedBook.title} (ID: {selectedBook.id})</h2>
                    <div className="toolbar-buttons">
                        <span className={`status-badge ${selectedBook.published ? "status-published" : "status-draft"}`}>
                            {selectedBook.published ? "Published" : "Draft"}
                        </span>
                        <button
                            onClick={() => handlePublish(false)}
                            className={`btn ${!selectedBook.published ? "btn-active" : "btn-secondary"}`}
                        >
                            Draft
                        </button>
                        <button
                            onClick={() => handlePublish(true)}
                            className={`btn ${selectedBook.published ? "btn-active" : "btn-secondary"}`}
                        >
                            Publish
                        </button>
                    </div>
                </div>

                {message && <p className="form-message">{message}</p>}

                {/* If book has pages, show flipbook */}
                {pages.length > 0 && (
                    <div className="book-preview">
                        <h3>Pages ({pages.length})</h3>
                        <div className="center-container">
                            <HTMLFlipBook width={400} height={500}>
                                {pages.map((page, index) => (
                                    <div key={index} className="card-box">
                                        <h2>Page {page.pageNumber}</h2>
                                        <p>{page.content}</p>
                                        {page.imageUrl && (
                                            <img src={optimizeCloudinary(page.imageUrl)} alt="Page" style={{ maxWidth: "100%", height: "auto" }} />
                                        )}
                                    </div>
                                ))}
                            </HTMLFlipBook>
                        </div>
                    </div>
                )}

                {/* Add page form */}
                <div className="add-page-section" style={{ marginTop: "24px" }}>
                    <h3>{pages.length === 0 ? "No pages yet. Add the first page:" : "Add another page:"}</h3>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Page Number</label>
                            <input
                                type="number"
                                placeholder="1"
                                value={pageNumber}
                                onChange={(e) => setPageNumber(e.target.value)}
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label>Format</label>
                            <input
                                type="text"
                                placeholder="bold, italic..."
                                value={format}
                                onChange={(e) => setFormat(e.target.value)}
                                className="form-input"
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Content</label>
                        <textarea
                            placeholder="Page content..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="form-input form-textarea"
                            rows={3}
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Image URL</label>
                            <input
                                type="text"
                                placeholder="https://..."
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label>Image URL 2</label>
                            <input
                                type="text"
                                placeholder="https://..."
                                value={imageUrl2}
                                onChange={(e) => setImageUrl2(e.target.value)}
                                className="form-input"
                            />
                        </div>
                    </div>
                    <button onClick={handleAddPage} className="btn btn-primary">
                        Add Page
                    </button>
                </div>
            </div>
        );
    }

    // Draft books list view
    return (
        <div className="add-book-container">
            <h2>Draft Books</h2>
            {drafts.length === 0 ? (
                <p>No draft books found. All books are published!</p>
            ) : (
                <ul className="draft-list">
                    {drafts.map((book) => (
                        <li key={book.id} className="draft-item">
                            <span className="status-badge status-draft">Draft</span>
                            <button
                                className="draft-link"
                                onClick={() => handleSelectBook(book)}
                            >
                                {book.title}
                            </button>
                            <span className="draft-id">ID: {book.id}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default DraftBooks;
