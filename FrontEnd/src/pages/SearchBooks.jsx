import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import FlipBook from "../FlipBook";
import { useStrings } from "../LanguageContext";
import "../BookManager.css";

const API = `${process.env.REACT_APP_API_URL}/api/books`;

function SearchBooks() {
  const strings = useStrings();
  const [searchId, setSearchId] = useState("");
  const [searchTitle, setSearchTitle] = useState("");
  const [searchAuthor, setSearchAuthor] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchCategory, setSearchCategory] = useState("");

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    setSelectedBook(null);
    try {
      const params = new URLSearchParams();
      if (searchId.trim()) params.append("id", searchId.trim());
      if (searchTitle.trim()) params.append("title", searchTitle.trim());
      if (searchAuthor.trim()) params.append("author", searchAuthor.trim());
      if (searchStatus) params.append("status", searchStatus);
      if (searchCategory) params.append("category", searchCategory);

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
    setSearchCategory("");
    setResults([]);
    setSearched(false);
    setSelectedBook(null);
  };

  const handleSelectBook = (book) => {
    setSelectedBook(book);
  };

  return (
    <div className="book-manager search-page">
      <h1>{strings.searchBooks.heading}</h1>

      <div className="bm-search-form">
        <div className="bm-search-fields">
          <input
            type="text"
            placeholder={strings.searchBooks.placeholderBookId}
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="bm-input bm-input-small"
            aria-label={strings.searchBooks.ariaBookId}
          />
          <input
            type="text"
            placeholder={strings.searchBooks.placeholderTitle}
            value={searchTitle}
            onChange={(e) => setSearchTitle(e.target.value)}
            className="bm-input"
            aria-label={strings.searchBooks.ariaTitle}
          />
          <input
            type="text"
            placeholder={strings.searchBooks.placeholderAuthor}
            value={searchAuthor}
            onChange={(e) => setSearchAuthor(e.target.value)}
            className="bm-input"
            aria-label={strings.searchBooks.ariaAuthor}
          />
          <select
            value={searchStatus}
            onChange={(e) => setSearchStatus(e.target.value)}
            className="bm-format-select"
            aria-label={strings.searchBooks.ariaStatus}
          >
            <option value="">{strings.searchBooks.statusAll}</option>
            <option value="DRAFT">{strings.searchBooks.statusDraft}</option>
            <option value="PUBLISHED">{strings.searchBooks.statusPublished}</option>
            <option value="ARCHIVED">{strings.searchBooks.statusArchived}</option>
          </select>
        </div>
        <div className="bm-search-actions">
          <button className="bm-btn bm-btn-all" onClick={handleSearch} disabled={loading}>
            {loading ? (
              <><span className="btn-spinner" /> {strings.searchBooks.searching}</>
            ) : strings.searchBooks.searchButton}
          </button>
          <button className="bm-btn bm-btn-back" onClick={handleClear}>{strings.searchBooks.clearButton}</button>
          <button
            className="bm-btn bm-btn-edit"
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
          >
            {showAdvanced ? strings.searchBooks.simpleSearch : strings.searchBooks.advancedSearch}
          </button>
        </div>
        {showAdvanced && (
          <div className="bm-search-fields" style={{ marginTop: "12px" }}>
            <select
              value={searchCategory}
              onChange={(e) => setSearchCategory(e.target.value)}
              className="bm-format-select"
              aria-label={strings.searchBooks.categoryFilter}
            >
              <option value="">{strings.searchBooks.categoryAll}</option>
              <option value="Art">Art</option>
              <option value="Music">Music</option>
              <option value="Writing">Writing</option>
              <option value="Tech">Tech</option>
              <option value="Creativity">Creativity</option>
              <option value="Community">Community</option>
            </select>
          </div>
        )}
      </div>

      {searched && !selectedBook && (
        <div className="bm-search-results-table">
          <h3>{strings.searchBooks.resultsHeading(results.length)}</h3>
          {results.length === 0 ? (
            <p>{strings.searchBooks.noResults}</p>
          ) : (
            <table className="bm-results-table">
              <thead>
                <tr>
                  <th>{strings.searchBooks.thId}</th>
                  <th>{strings.searchBooks.thTitle}</th>
                  <th>{strings.searchBooks.thAuthor}</th>
                  <th>{strings.searchBooks.thStatus}</th>
                  <th>{strings.searchBooks.thModified}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((book) => (
                  <tr key={book.id}>
                    <td>{book.id}</td>
                    <td>
                      <button className="bm-table-link" onClick={() => handleSelectBook(book)}>
                        {book.title}
                      </button>
                    </td>
                    <td>
                      {book.authorName ? (
                        <Link to={`/profile/${book.userId}`} className="bm-author-link">
                          {book.authorName}
                        </Link>
                      ) : strings.searchBooks.emptyAuthor}
                    </td>
                    <td>
                      <span className={`bm-status-dot ${book.status === "PUBLISHED" ? "dot-published" : "dot-draft"}`} />
                      {book.status}
                    </td>
                    <td>{book.modifiedDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {searched && selectedBook && (
        <div className="bm-split-view">
          <aside className="bm-split-sidebar">
            <h4>{strings.searchBooks.booksHeading(results.length)}</h4>
            <ul className="bm-split-list">
              {results.map((book) => (
                <li
                  key={book.id}
                  className={`bm-split-item ${book.id === selectedBook.id ? "bm-split-active" : ""}`}
                >
                  <button className="bm-split-link" onClick={() => handleSelectBook(book)}>
                    <span className="bm-split-num">{book.id}</span>
                    <span className="bm-split-title">{book.title}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button className="bm-btn bm-btn-back bm-btn-sm" onClick={() => setSelectedBook(null)} style={{ marginTop: "10px" }}>
              {strings.searchBooks.backToTable}
            </button>
          </aside>
          <div className="bm-split-reader">
            <h2>{selectedBook.title}</h2>
            {selectedBook.authorName && (
              <p className="bm-date">
                <Link to={`/profile/${selectedBook.userId}`} className="bm-author-link">
                  {strings.searchBooks.byAuthor(selectedBook.authorName)}
                </Link>
              </p>
            )}
            <FlipBook bookId={selectedBook.id} />
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchBooks;
