import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../AuthContext";
import { useStrings } from "../LanguageContext";
import "./CategoryPage.css";

const BASE_API = process.env.REACT_APP_API_URL;
const API = `${BASE_API}/api/books`;

function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return `${BASE_API}${url}`;
  const match = url.match(/\/file\/d\/([^/]+)\//);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w200`;
  return url;
}

const categoryIcons = {
    art: "\uD83C\uDFA8",
    music: "\uD83C\uDFB5",
    writing: "\u270D\uFE0F",
    tech: "\uD83D\uDCBB",
    creativity: "\u2728",
    community: "\uD83C\uDF10",
};

function CategoryPage() {
    const { category } = useParams();
    const { user } = useAuth();
    const strings = useStrings();
    const navigate = useNavigate();
    const s = strings.categoryPage || {};
    const catKey = category.toLowerCase();
    const title = category.charAt(0).toUpperCase() + category.slice(1);
    const icon = categoryIcons[catKey] || "\uD83D\uDCDA";

    const userId = user?.userId || null;

    const [view, setView] = useState("browse"); // browse | create | mybooks | allbooks
    const [publishedBooks, setPublishedBooks] = useState([]);
    const [allBooks, setAllBooks] = useState([]);
    const [myBooks, setMyBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newTitle, setNewTitle] = useState("");
    const [creating, setCreating] = useState(false);
    const [message, setMessage] = useState("");

    const showMessage = (msg) => {
        setMessage(msg);
        setTimeout(() => setMessage(""), 3000);
    };

    // Fetch published books for this category
    useEffect(() => {
        const fetchPublished = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${API}/category/${catKey}`);
                setPublishedBooks(Array.isArray(res.data) ? res.data : []);
            } catch {
                setPublishedBooks([]);
            }
            setLoading(false);
        };
        fetchPublished();
        setView("browse");
    }, [catKey]);

    // Fetch all published books (across all categories)
    const fetchAllBooks = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/search?status=PUBLISHED`);
            setAllBooks(Array.isArray(res.data) ? res.data : []);
        } catch {
            setAllBooks([]);
        }
        setLoading(false);
    };

    // Fetch my books for this category
    const fetchMyBooks = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const res = await axios.get(`${API}/category/${catKey}/user/${userId}`);
            setMyBooks(Array.isArray(res.data) ? res.data : []);
        } catch {
            setMyBooks([]);
        }
        setLoading(false);
    };

    const handleCreate = async () => {
        if (!newTitle.trim()) {
            showMessage(s.enterTitle || "Please enter a title");
            return;
        }
        setCreating(true);
        try {
            await axios.post(`${API}/create`, {
                title: newTitle.trim(),
                userId,
                category: catKey,
            });
            showMessage(s.bookCreated || "Book created as Draft!");
            setNewTitle("");
            setView("mybooks");
            fetchMyBooks();
        } catch (err) {
            showMessage(s.createFailed || "Failed to create book");
        }
        setCreating(false);
    };

    const handleDelete = async (bookId) => {
        if (!window.confirm(s.confirmDelete || "Delete this book?")) return;
        try {
            await axios.delete(`${API}/${bookId}?userId=${userId}`);
            showMessage(s.bookDeleted || "Book deleted!");
            fetchMyBooks();
        } catch {
            showMessage(s.deleteFailed || "Failed to delete book");
        }
    };

    const handlePublish = async (bookId) => {
        try {
            await axios.put(`${API}/${bookId}/publish?userId=${userId}`);
            showMessage(s.bookPublished || "Book published!");
            fetchMyBooks();
        } catch {
            showMessage(s.publishFailed || "Failed to publish");
        }
    };

    return (
        <div className="cat-page">
            <div className="cat-hero">
                <span className="cat-hero-icon">{icon}</span>
                <h1>{title}</h1>
                <p className="cat-hero-desc">
                    {s.descriptions?.[catKey] || `Explore and share ${title} content with the community`}
                </p>
            </div>

            {message && <div className="cat-message" onClick={() => setMessage("")}>{message}</div>}

            {/* Navigation tabs */}
            <div className="cat-tabs">
                <button className={view === "browse" ? "active" : ""} onClick={() => setView("browse")}>
                    {s.tabBrowse || "Browse"}
                </button>
                <button className={view === "allbooks" ? "active" : ""} onClick={() => { setView("allbooks"); fetchAllBooks(); }}>
                    Books
                </button>
                {user && (
                    <>
                        <button className={view === "create" ? "active" : ""} onClick={() => setView("create")}>
                            {s.tabCreate || "Create"}
                        </button>
                        <button className={view === "mybooks" ? "active" : ""} onClick={() => { setView("mybooks"); fetchMyBooks(); }}>
                            {s.tabMyBooks || "My Books"}
                        </button>
                    </>
                )}
            </div>

            {/* Browse published books */}
            {view === "browse" && (
                <div className="cat-section">
                    {loading ? (
                        <p className="cat-loading">{strings.common.loading}</p>
                    ) : publishedBooks.length === 0 ? (
                        <div className="cat-empty">
                            <p>{s.noPublished || "No published books in this category yet."}</p>
                            {user && (
                                <button className="cat-btn cat-btn-primary" onClick={() => setView("create")}>
                                    {s.beFirst || "Be the first to create one!"}
                                </button>
                            )}
                            {!user && (
                                <p><Link to="/Login">{s.loginToCreate || "Log in to create content"}</Link></p>
                            )}
                        </div>
                    ) : (
                        <div className="cat-book-grid">
                            {publishedBooks.map((book) => (
                                <button
                                    key={book.id}
                                    className="cat-book-card"
                                    onClick={() => navigate(`/read/${book.id}`)}
                                >
                                    <div className="cat-book-cover">
                                        {book.coverImageUrl ? (
                                            <img src={resolveImageUrl(book.coverImageUrl)} alt={book.title} className="cat-book-cover-img" />
                                        ) : (
                                            <>
                                                <span className="cat-book-icon">{icon}</span>
                                                <span className="cat-book-title">{book.title}</span>
                                            </>
                                        )}
                                    </div>
                                    {book.authorName && (
                                        <span className="cat-book-author">{book.authorName}</span>
                                    )}
                                    <span className="cat-book-read">{strings.publicBooks.readButton}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* All published books */}
            {view === "allbooks" && (
                <div className="cat-section">
                    <h2 className="cat-section-heading">All Published Books</h2>
                    {loading ? (
                        <p className="cat-loading">{strings.common.loading}</p>
                    ) : allBooks.length === 0 ? (
                        <div className="cat-empty">
                            <p>No published books yet.</p>
                        </div>
                    ) : (
                        <div className="cat-book-grid">
                            {allBooks.map((book) => (
                                <button
                                    key={book.id}
                                    className="cat-book-card"
                                    onClick={() => navigate(`/read/${book.id}`)}
                                >
                                    <div className="cat-book-cover">
                                        {book.coverImageUrl ? (
                                            <img src={resolveImageUrl(book.coverImageUrl)} alt={book.title} className="cat-book-cover-img" />
                                        ) : (
                                            <>
                                                <span className="cat-book-icon">{categoryIcons[book.category?.toLowerCase()] || "\uD83D\uDCDA"}</span>
                                                <span className="cat-book-title">{book.title}</span>
                                            </>
                                        )}
                                    </div>
                                    {book.authorName && (
                                        <span className="cat-book-author">{book.authorName}</span>
                                    )}
                                    {book.category && (
                                        <span className="cat-book-category">{book.category}</span>
                                    )}
                                    <span className="cat-book-read">{strings.publicBooks.readButton}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Create new book in this category */}
            {view === "create" && (
                <div className="cat-section">
                    <div className="cat-create-form">
                        <h2>{(typeof s.createHeading === "function" ? s.createHeading(title) : s.createHeading) || `Create a ${title} Book`}</h2>
                        <input
                            type="text"
                            className="cat-input"
                            placeholder={s.titlePlaceholder || "Enter book title..."}
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                        />
                        <button className="cat-btn cat-btn-primary" onClick={handleCreate} disabled={creating}>
                            {creating ? (strings.bookManager.creating) : (s.createButton || "Create Book")}
                        </button>
                        <p className="cat-create-hint">
                            {s.createHint || "Your book will be created as a draft. Use the Books page to add pages, images, and publish."}
                        </p>
                    </div>
                </div>
            )}

            {/* My books in this category */}
            {view === "mybooks" && (
                <div className="cat-section">
                    <h2>{(typeof s.myBooksHeading === "function" ? s.myBooksHeading(title) : s.myBooksHeading) || `My ${title} Books`}</h2>
                    {loading ? (
                        <p className="cat-loading">{strings.common.loading}</p>
                    ) : myBooks.length === 0 ? (
                        <div className="cat-empty">
                            <p>{s.noMyBooks || "You haven't created any books in this category yet."}</p>
                            <button className="cat-btn cat-btn-primary" onClick={() => setView("create")}>
                                {s.createFirst || "Create your first one"}
                            </button>
                        </div>
                    ) : (
                        <div className="cat-mybooks-list">
                            {myBooks.map((book) => (
                                <div key={book.id} className="cat-mybook-card">
                                    <div className="cat-mybook-info">
                                        <h3>{book.title}</h3>
                                        <span className={`cat-status cat-status-${(book.status || "draft").toLowerCase()}`}>
                                            {book.status}
                                        </span>
                                        <span className="cat-mybook-date">{book.modifiedDate}</span>
                                    </div>
                                    <div className="cat-mybook-actions">
                                        <Link to="/books" state={{ editBookId: book.id }} className="cat-btn cat-btn-edit">
                                            {strings.common.edit}
                                        </Link>
                                        {book.status === "DRAFT" && (
                                            <button className="cat-btn cat-btn-publish" onClick={() => handlePublish(book.id)}>
                                                {strings.bookManager.publish}
                                            </button>
                                        )}
                                        <button className="cat-btn cat-btn-delete" onClick={() => handleDelete(book.id)}>
                                            {strings.common.delete}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="cat-footer-link">
                <Link to="/">{strings.category.backToHome}</Link>
            </div>
        </div>
    );
}

export default CategoryPage;
