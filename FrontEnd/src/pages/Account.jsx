import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../AuthContext";
import { useStrings } from "../LanguageContext";
import "../Account.css";

const API_BOOKS = `${process.env.REACT_APP_API_URL}/api/books`;
const API_AUTH = `${process.env.REACT_APP_API_URL}/api/auth`;

function Account() {
  const { user } = useAuth();
  const strings = useStrings();
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        const [booksRes, profileRes] = await Promise.all([
          axios.get(`${API_BOOKS}/user/${user.userId}`),
          axios.get(`${API_AUTH}/user/${user.userId}`),
        ]);
        setBooks(Array.isArray(booksRes.data) ? booksRes.data : []);
        setProfile(profileRes.data);
      } catch {
        setError(strings.account.error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (!user) {
    return (
      <div className="account-page">
        <p className="acct-login-prompt">{strings.account.loginRequired}</p>
        <div style={{ textAlign: "center" }}>
          <button
            className="bm-btn bm-btn-create"
            onClick={() => navigate("/Login")}
          >
            {strings.header.navLogin}
          </button>
        </div>
      </div>
    );
  }

  const statusClass = (status) => {
    switch (status) {
      case "PUBLISHED": return "bm-status-published";
      case "DRAFT": return "bm-status-draft";
      default: return "bm-status-draft";
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="account-page">
      <div className="acct-nav-bar">
        <button className="bm-btn bm-btn-back" onClick={() => navigate(-1)}>
          {strings.common.back}
        </button>
        <Link to="/books" className="bm-btn bm-btn-back" style={{ textDecoration: "none" }}>
          {strings.readBook.books}
        </Link>
        <Link to="/" className="bm-btn bm-btn-back" style={{ textDecoration: "none" }}>
          {strings.readBook.home}
        </Link>
      </div>
      <h1>{strings.account.heading}</h1>

      <div className="acct-profile-card">
        <div className="acct-profile-top">
          <div className="acct-avatar-wrap">
            {profile && profile.profileImageUrl ? (
              <img
                src={profile.profileImageUrl.startsWith("http") ? profile.profileImageUrl : `${process.env.REACT_APP_API_URL}${profile.profileImageUrl}`}
                alt={profile.displayName || user.name}
                className="acct-profile-avatar"
              />
            ) : (
              <div className="acct-avatar-placeholder">
                {(profile?.displayName || user.name || "?").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="acct-profile-details">
            <h2 className="acct-display-name">{profile?.displayName || user.name}</h2>
            {profile?.headline && (
              <p className="acct-headline">{profile.headline}</p>
            )}
            <div className="acct-meta-row">
              <span className="acct-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                {user.email}
              </span>
              {profile?.location && (
                <span className="acct-meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {profile.location}
                </span>
              )}
            </div>
          </div>
        </div>
        {profile?.bio && (
          <div className="acct-bio-section">
            <h3 className="acct-bio-label">{strings.account.labelBio}</h3>
            <p className="acct-bio-text">{profile.bio}</p>
          </div>
        )}
        {profile?.interests && (
          <div className="acct-tags-section">
            <h3 className="acct-bio-label">{strings.account.labelInterests}</h3>
            <div className="acct-tags">
              {profile.interests.split(",").map((item, i) => (
                <span key={i} className="acct-tag">{item.trim()}</span>
              ))}
            </div>
          </div>
        )}
        {profile?.fields && (
          <div className="acct-tags-section">
            <h3 className="acct-bio-label">{strings.account.labelFields}</h3>
            <div className="acct-tags">
              {profile.fields.split(",").map((item, i) => (
                <span key={i} className="acct-tag acct-tag-field">{item.trim()}</span>
              ))}
            </div>
          </div>
        )}
        <div className="acct-profile-actions">
          <Link to="/profile" className="acct-profile-link">
            {profile?.displayName ? strings.account.editProfile : strings.account.createProfile}
          </Link>
          {profile?.displayName && (
            <Link to={`/profile/${user.userId}`} className="acct-profile-link acct-profile-link-secondary">
              {strings.account.viewPublicProfile}
            </Link>
          )}
        </div>
      </div>

      <h2>{strings.account.booksHeading}</h2>

      {loading && <p className="acct-loading">{strings.account.loading}</p>}
      {error && <p className="acct-error">{error}</p>}

      {!loading && !error && books.length === 0 && (
        <p className="acct-empty">{strings.account.emptyState}</p>
      )}

      {!loading && !error && books.length > 0 && (
        <table className="acct-books-table">
          <thead>
            <tr>
              <th>{strings.account.thTitle}</th>
              <th>{strings.account.thStatus}</th>
              <th>{strings.account.thCreated}</th>
              <th>{strings.account.thModified}</th>
              <th>{strings.account.thActions}</th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr key={book.id}>
                <td>
                  <Link to={`/read/${book.id}`} className="acct-book-link">
                    {book.title}
                  </Link>
                </td>
                <td>
                  <span className={`bm-status ${statusClass(book.status)}`}>
                    {book.status}
                  </span>
                </td>
                <td>{formatDate(book.createdDate)}</td>
                <td>{formatDate(book.modifiedDate)}</td>
                <td>
                  <button
                    className="bm-btn bm-btn-edit bm-btn-sm"
                    onClick={() =>
                      navigate("/books", { state: { editBookId: book.id } })
                    }
                  >
                    {strings.account.editButton}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Account;
