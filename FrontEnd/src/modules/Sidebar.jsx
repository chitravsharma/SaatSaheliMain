import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import siteLogo from './SaatSaheliLogo.jpg';
import './sidebar.css';

const API_BASE = process.env.REACT_APP_API_URL;

const RATING_STARS = {
  "Excellent": "★★★★★",
  "Good": "★★★★☆",
  "Average": "★★★☆☆",
  "Poor": "★★☆☆☆",
  "Very Poor": "★☆☆☆☆",
};

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && reviews.length === 0) {
      setLoading(true);
      axios.get(`${API_BASE}/api/contact/reviews?limit=10`)
        .then(res => setReviews(Array.isArray(res.data) ? res.data : []))
        .catch(() => setReviews([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, reviews.length]);

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <button className="toggle-button" onClick={toggleSidebar}>
        {isOpen ? '✕' : '☰'}
      </button>

      <div className="sidebar-content">
        {/* Logo & Nav */}
        <nav className="sidebar-nav">
          <div className="sidebar-logo-wrap">
            <img src={siteLogo} className="sidebar-logo" alt="Saat Saheli logo" />
          </div>
          <ul className="sidebar-links">
            <li><Link to="/" onClick={toggleSidebar}>Home</Link></li>
            <li><Link to="/about" onClick={toggleSidebar}>About</Link></li>
            <li><Link to="/contacts" onClick={toggleSidebar}>Contact</Link></li>
            <li><Link to="/feedback" onClick={toggleSidebar}>Give Feedback</Link></li>
          </ul>
        </nav>

        {/* Ratings & Reviews Section */}
        <div className="sidebar-reviews-section">
          <h3 className="sidebar-reviews-title">User Reviews</h3>

          {loading && (
            <div className="sidebar-loading">Loading reviews...</div>
          )}

          {!loading && reviews.length === 0 && (
            <div className="sidebar-no-reviews">
              No reviews yet. Be the first to{' '}
              <Link to="/feedback" onClick={toggleSidebar}>share your feedback</Link>!
            </div>
          )}

          <div className="sidebar-reviews-list">
            {reviews.map((review, idx) => (
              <div className="sidebar-review-card" key={idx}>
                <div className="sidebar-review-header">
                  <span className="sidebar-review-name">{review.name}</span>
                  <span className="sidebar-review-time">{timeAgo(review.createdDate)}</span>
                </div>
                {review.rating && (
                  <div className="sidebar-review-rating">
                    <span className="sidebar-stars">{RATING_STARS[review.rating] || review.rating}</span>
                    <span className="sidebar-rating-label">{review.rating}</span>
                  </div>
                )}
                {review.category && (
                  <span className="sidebar-review-category">{review.category}</span>
                )}
                <p className="sidebar-review-message">{review.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
