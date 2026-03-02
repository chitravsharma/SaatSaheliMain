import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../AuthContext";
import { useStrings } from "../LanguageContext";
import "../Account.css";

const API = `${process.env.REACT_APP_API_URL}/api/books`;

function Account() {
  const { user } = useAuth();
  const strings = useStrings();
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchBooks = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await axios.get(`${API}/user/${user.userId}`);
        setBooks(Array.isArray(res.data) ? res.data : []);
      } catch {
        setError(strings.account.error);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
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
      <h1>{strings.account.heading}</h1>

      <div className="acct-user-info">
        <h2>{strings.account.userInfoHeading}</h2>
        <p><strong>{strings.account.labelName}:</strong> {user.name}</p>
        <p><strong>{strings.account.labelEmail}:</strong> {user.email}</p>
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
