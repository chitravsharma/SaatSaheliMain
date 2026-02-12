import React from "react";
import { useParams, Link } from "react-router-dom";
import "./Home.css";

function CategoryPage() {
  const { category } = useParams();
  const title = category.charAt(0).toUpperCase() + category.slice(1);

  return (
    <div className="home-container">
      <div className="home-hero">
        <h1>{title}</h1>
        <hr className="home-divider" />
      </div>
      <div className="home-card">
        <p>Content for <strong>{title}</strong> is coming soon. Stay tuned!</p>
      </div>
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <Link to="/" className="home-back-link">Back to Home</Link>
      </div>
    </div>
  );
}

export default CategoryPage;
