import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../BookManager.css";

const API = "http://localhost:8081/api/books";

function SearchBooks() {
  const [searchId, setSearchId] = useState("");
  const [searchTitle, setSearchTitle] = useState("");
  const [searchAuthor, setSearchAuthor] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (searchId.trim()) params.append("id", searchId.trim());
      if (searchTitle.trim()) params.append("title", searchTitle.trim());
      if (searchAuthor.trim()) params.append("author", searchAuthor.trim());
      if (searchStatus) params.append("status", searchStatus);

      const res = await axios.get(`${API}/search?${params.toString()}`);
      setResults(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSearchId("");
    setSearchTitle("");
    setSearchAuthor("");
    setSearchStatus("");
    setResults([]);
    setSearched(false);
  };

  return (
    <div className="book-manager">
      <h1>Search Books</h1>

      <div className="bm-search-form">
        <div className="bm-search-fields">
          <input
            type="text"
            placeholder="Book ID"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="bm-input bm-input-small"
            aria-label="Search by book ID"
          />
          <input
            type="text"
            placeholder="Title"
            value={searchTitle}
            onChange={(e) => setSearchTitle(e.target.value)}
            className="bm-input"
            aria-label="Search by title"
          />
          <input
            type="text"
            placeholder="Author name"
            value={searchAuthor}
            onChange={(e) => setSearchAuthor(e.target.value)}
            className="bm-input"
            aria-label="Search by author"
          />
          <select
            value={searchStatus}
            onChange={(e) => setSearchStatus(e.target.value)}
            className="bm-format-select"
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div className="bm-search-actions">
          <button className="bm-btn bm-btn-all" onClick={handleSearch} disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
          <button className="bm-btn bm-btn-back" onClick={handleClear}>Clear</button>
        </div>
      </div>

      {searched && (
        <div className="bm-book-list">
          <h3>Results ({results.length})</h3>
          {results.length === 0 && <p>No books found.</p>}
          {results.map((book) => (
            <div key={book.id} className="bm-book-card">
              <div className="bm-book-info">
                <h3>
                  <Link to={`/read/${book.id}`} className="bm-book-link">
                    {book.title}
                  </Link>
                </h3>
                <span className={`bm-status ${book.status === "PUBLISHED" ? "bm-status-published" : "bm-status-draft"}`}>
                  {book.status}
                </span>
                {book.authorName && (
                  <p className="bm-date">Author: {book.authorName}</p>
                )}
                <p className="bm-date">ID: {book.id} | Modified: {book.modifiedDate}</p>
              </div>
              <div className="bm-book-actions">
                <Link to={`/read/${book.id}`} className="bm-btn bm-btn-preview" style={{ textDecoration: "none" }}>
                  Read
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SearchBooks;
