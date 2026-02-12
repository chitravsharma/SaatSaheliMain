import React from "react";
import { useParams, Link } from "react-router-dom";
import FlipBook from "../FlipBook";
import "../BookManager.css";

function ReadBook() {
  const { bookId } = useParams();

  return (
    <div className="book-manager">
      <FlipBook bookId={bookId} />
      <div style={{ marginTop: "20px" }}>
        <Link to="/search" className="bm-btn bm-btn-back" style={{ textDecoration: "none" }}>
          Back to Search
        </Link>
      </div>
    </div>
  );
}

export default ReadBook;
