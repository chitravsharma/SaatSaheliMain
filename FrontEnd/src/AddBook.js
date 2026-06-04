import React, { useState } from "react";
import api, { isUpgradeRequiredError } from "./utils/api";
import { optimizeCloudinary } from "./utils/imageUrl";
import HTMLFlipBook from "react-pageflip";

const API = `${process.env.REACT_APP_API_URL}/api/books`;

function AddBook() {
    const [title, setTitle] = useState("");
    const [book, setBook] = useState(null);
    const [pages, setPages] = useState([]);
    const [status, setStatus] = useState("draft");

    // Page form fields
    const [pageNumber, setPageNumber] = useState("");
    const [content, setContent] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [imageUrl2, setImageUrl2] = useState("");
    const [format, setFormat] = useState("");
    const [message, setMessage] = useState("");

    const handleCreateBook = async () => {
        if (!title.trim()) return;
        try {
            const res = await api.post(API, { title: title.trim() });
            setBook(res.data);
            setMessage(`Book "${res.data.title}" created with ID ${res.data.id}`);
        } catch (err) {
            if (isUpgradeRequiredError(err)) return; // global upgrade modal already shown
            setMessage("Failed to create book: " + err.message);
        }
    };

    const handleAddPage = async () => {
        if (!pageNumber) return;
        try {
            const res = await api.post(`${API}/${book.id}/page`, {
                pageNumber: parseInt(pageNumber),
                content,
                imageUrl,
                imageUrl2,
                format,
            });
            setPages([...pages, res.data].sort((a, b) => a.pageNumber - b.pageNumber));
            setMessage(`Page ${res.data.pageNumber} added`);
            // Reset page form
            setPageNumber("");
            setContent("");
            setImageUrl("");
            setImageUrl2("");
            setFormat("");
        } catch (err) {
            if (isUpgradeRequiredError(err)) return; // global upgrade modal already shown
            setMessage("Failed to add page: " + err.message);
        }
    };

    const handlePublish = async (publish) => {
        try {
            const res = await api.put(`${API}/${book.id}/publish`, { published: publish });
            setBook(res.data);
            setStatus(publish ? "published" : "draft");
            setMessage(publish ? "Book published!" : "Book set to draft.");
        } catch (err) {
            setMessage("Failed to update status: " + err.message);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            if (!book) handleCreateBook();
            else handleAddPage();
        }
    };

    // Step 1: Create Book form
    if (!book) {
        return (
            <div className="add-book-container">
                <h2>Create a New Book</h2>
                <div className="form-group">
                    <label>Book Title</label>
                    <input
                        type="text"
                        placeholder="Enter book title..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="form-input"
                    />
                </div>
                <button onClick={handleCreateBook} className="btn btn-primary">
                    Create Book
                </button>
                {message && <p className="form-message">{message}</p>}
            </div>
        );
    }

    // Step 2: Book created — add pages + preview
    return (
        <div className="add-book-container">
            <div className="book-toolbar">
                <h2>{book.title} (ID: {book.id})</h2>
                <div className="toolbar-buttons">
                    <span className={`status-badge status-${status}`}>
                        {status === "draft" ? "Draft" : "Published"}
                    </span>
                    <button
                        onClick={() => handlePublish(false)}
                        className={`btn ${status === "draft" ? "btn-active" : "btn-secondary"}`}
                    >
                        Draft
                    </button>
                    <button
                        onClick={() => handlePublish(true)}
                        className={`btn ${status === "published" ? "btn-active" : "btn-secondary"}`}
                    >
                        Publish
                    </button>
                </div>
            </div>

            {message && <p className="form-message">{message}</p>}

            <div className="add-page-section">
                <h3>Add a Page</h3>
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

            {pages.length > 0 && (
                <div className="book-preview">
                    <h3>Preview ({pages.length} page{pages.length !== 1 ? "s" : ""})</h3>
                    <div className="center-container">
                        <HTMLFlipBook width={400} height={500}>
                            {pages.map((page, index) => (
                                <div key={index} className="card-box">
                                    <h2>Page {page.pageNumber}</h2>
                                    <p>{page.content}</p>
                                    {page.imageUrl && (
                                        <img
                                            src={optimizeCloudinary(page.imageUrl)}
                                            alt="Page"
                                            style={{ maxWidth: "100%", height: "auto" }}
                                        />
                                    )}
                                </div>
                            ))}
                        </HTMLFlipBook>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AddBook;
