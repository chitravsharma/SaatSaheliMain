import React from "react";
import { AMAZON_SERIES_URL } from "./PrintedIssueCovers";
import "./MagazineAmazonCta.css";

/**
 * Compact "buy the printed magazine on Amazon" call-to-action. Shown to all
 * visitors (incl. logged-in) on the home magazine banner and /magazine. On
 * /magazine/submit it sits below the submit button and on the confirmation
 * panel, not above the form, so it never competes with the form itself.
 */
export default function MagazineAmazonCta() {
  return (
    <div className="mag-amazon-cta">
      <span className="mag-amazon-cta-text">📖 Get your hard copy today</span>
      <a className="mag-amazon-cta-btn" href={AMAZON_SERIES_URL} target="_blank" rel="noopener noreferrer">
        🛒 Order now on Amazon
      </a>
    </div>
  );
}
