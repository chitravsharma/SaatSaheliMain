import React from "react";
import { useParams, Link } from "react-router-dom";
import FlipBook from "../FlipBook";
import strings from "../constants/strings";
import "../BookManager.css";

function ReadBook() {
  const { bookId } = useParams();

  return (
    <div className="book-manager">
      <FlipBook bookId={bookId} />
      <div style={{ marginTop: "20px" }}>
        <Link to="/search" className="bm-btn bm-btn-back" style={{ textDecoration: "none" }}>
          {strings.readBook.backToSearch}
        </Link>
      </div>
    </div>
  );
}

export default ReadBook;
