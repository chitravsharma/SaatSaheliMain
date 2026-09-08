import React from "react";
import "./MagazineAmazonCta.css";

// The series page lists every printed issue, so a reader landing here always
// sees the newest one rather than only the launch issue.
const AMAZON_URL =
  "https://www.amazon.com/dp/B0H2V6756N?binding=paperback&ref=dbs_dp_rwt_sb_pc_tpbk";

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
      <a className="mag-amazon-cta-btn" href={AMAZON_URL} target="_blank" rel="noopener noreferrer">
        🛒 Order now on Amazon
      </a>
    </div>
  );
}
