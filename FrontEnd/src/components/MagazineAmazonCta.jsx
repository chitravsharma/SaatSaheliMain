import React from "react";
import "./MagazineAmazonCta.css";

const AMAZON_URL = "https://www.amazon.com/dp/B0H3LW82QK";

/**
 * Compact "buy the printed magazine on Amazon" call-to-action. Shown to all
 * visitors (incl. logged-in) on the home magazine banner, /magazine and
 * /magazine/submit.
 */
export default function MagazineAmazonCta() {
  return (
    <div className="mag-amazon-cta">
      <span className="mag-amazon-cta-text">📖 Get your hard copy today</span>
      <a className="mag-amazon-cta-btn" href={AMAZON_URL} target="_blank" rel="noopener noreferrer">
        🛒 Order now on Amazon
      </a>
    </div>
  );
}
