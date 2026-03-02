import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import FlipBook from "../FlipBook";
import { useStrings } from "../LanguageContext";
import "../BookManager.css";

function ReadBook() {
  const { bookId } = useParams();
  const strings = useStrings();
  const navigate = useNavigate();

  return (
    <div className="book-manager">
      <div className="bm-reader-nav">
        <button className="bm-btn bm-btn-back" onClick={() => navigate(-1)}>
          {strings.common.back}
        </button>
        <Link to="/" className="bm-btn bm-btn-back" style={{ textDecoration: "none" }}>
          {strings.readBook.home}
        </Link>
        <Link to="/books" className="bm-btn bm-btn-back" style={{ textDecoration: "none" }}>
          {strings.readBook.books}
        </Link>
        <Link to="/search" className="bm-btn bm-btn-back" style={{ textDecoration: "none" }}>
          {strings.readBook.backToSearch}
        </Link>
      </div>
      <FlipBook bookId={bookId} />
    </div>
  );
}

export default ReadBook;
