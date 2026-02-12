import FlipBook from "../FlipBook";
import React, { useState, useEffect } from "react";
import axios from "axios";
import strings from "../constants/strings";
import './Home.css';

function Home() {
  const [searchId, setSearchId] = useState('');
  const [searchTitle, setSearchTitle] = useState('');
  const [searchAuthor, setSearchAuthor] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [results, setResults] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem('saatSaheliUser');
    setIsLoggedIn(!!user);
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSearched(true);
    setSelectedBookId(null);

    try {
      const params = new URLSearchParams();
      if (searchId.trim()) params.append('id', searchId.trim());
      if (searchTitle.trim()) params.append('title', searchTitle.trim());
      if (searchAuthor.trim()) params.append('author', searchAuthor.trim());
      if (searchStatus) params.append('status', searchStatus);

      const res = await axios.get(`http://localhost:8081/api/books/search?${params.toString()}`);
      setResults(res.data);
    } catch (err) {
      setError(strings.home.searchError);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSearchId('');
    setSearchTitle('');
    setSearchAuthor('');
    setSearchStatus('');
    setResults([]);
    setSelectedBookId(null);
    setSearched(false);
    setError('');
  };

  const getStatusClass = (status) => {
    if (!status) return '';
    return status.toUpperCase() === 'PUBLISHED' ? 'home-status-published' : 'home-status-draft';
  };

  return (
    <div className="home-container">
      <h1>{strings.home.welcomeHeading}</h1>

      <form className="home-search-form" onSubmit={handleSearch} role="search" aria-label={strings.home.searchAriaLabel}>
        <h2>{strings.home.searchHeading}</h2>
        <div className="home-search-fields">
          <div className="home-field">
            <label htmlFor="search-id">{strings.home.labelBookId}</label>
            <input
              id="search-id"
              type="number"
              placeholder={strings.home.placeholderBookId}
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />
          </div>
          <div className="home-field">
            <label htmlFor="search-title">{strings.home.labelBookName}</label>
            <input
              id="search-title"
              type="text"
              placeholder={strings.home.placeholderTitle}
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
            />
          </div>
          <div className="home-field">
            <label htmlFor="search-author">{strings.home.labelAuthorName}</label>
            <input
              id="search-author"
              type="text"
              placeholder={strings.home.placeholderAuthor}
              value={searchAuthor}
              onChange={(e) => setSearchAuthor(e.target.value)}
            />
          </div>
          {isLoggedIn && (
            <div className="home-field">
              <label htmlFor="search-status">{strings.home.labelStatus}</label>
              <select
                id="search-status"
                value={searchStatus}
                onChange={(e) => setSearchStatus(e.target.value)}
              >
                <option value="">{strings.home.statusAll}</option>
                <option value="PUBLISHED">{strings.home.statusPublished}</option>
                <option value="DRAFT">{strings.home.statusDraft}</option>
              </select>
            </div>
          )}
        </div>
        <div className="home-search-actions" style={{ marginTop: 16 }}>
          <button type="submit" className="home-btn home-btn-search">
            {strings.home.searchButton}
          </button>
          <button type="button" className="home-btn home-btn-clear" onClick={handleClear}>
            {strings.home.clearButton}
          </button>
        </div>
      </form>

      {error && <div className="home-error" role="alert">{error}</div>}

      {loading && <div className="home-loading" aria-live="polite">{strings.home.searching}</div>}

      {searched && !loading && (
        <div className="home-results" aria-live="polite">
          <h2>{strings.home.resultsHeading}</h2>
          <p className="home-results-count">
            {strings.home.resultsCount(results.length)}
          </p>
          {results.length === 0 ? (
            <div className="home-empty">{strings.home.noResults}</div>
          ) : (
            results.map((book) => (
              <div
                key={book.id}
                className={`home-result-card${selectedBookId === book.id ? ' selected' : ''}`}
                onClick={() => setSelectedBookId(book.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedBookId(book.id); } }}
                tabIndex={0}
                role="button"
                aria-pressed={selectedBookId === book.id}
                aria-label={strings.home.viewLabel(book.title)}
              >
                <div className="home-result-info">
                  <h3>
                    {book.title}
                    {book.status && (
                      <span className={`home-status ${getStatusClass(book.status)}`}>
                        {book.status}
                      </span>
                    )}
                  </h3>
                  {book.authorName && (
                    <p className="home-result-meta">{strings.home.authorPrefix}{book.authorName}</p>
                  )}
                  <p className="home-result-meta">{strings.home.idPrefix}{book.id}</p>
                </div>
                <div className="home-result-right">
                  {book.createdDate && (
                    <span className="home-result-meta">{strings.home.createdPrefix}{book.createdDate}</span>
                  )}
                  {book.modifiedDate && (
                    <span className="home-result-meta">{strings.home.modifiedPrefix}{book.modifiedDate}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {selectedBookId && (
        <div className="home-viewer">
          <h2>{strings.home.viewingBook(selectedBookId)}</h2>
          <FlipBook bookId={selectedBookId} />
        </div>
      )}
    </div>
  );
}

export default Home;
