import React from "react";
import "./PrintedIssueCovers.css";

// Amazon listings for the printed magazine, shared by every surface that links
// to it. The series page lists each issue as it ships, so it is what the main
// call-to-action points at; the launch issue keeps its own product link because
// that listing predates the series.
export const AMAZON_SERIES_URL =
  "https://www.amazon.com/dp/B0H2V6756N?binding=paperback&ref=dbs_dp_rwt_sb_pc_tpbk";
export const AMAZON_LAUNCH_ISSUE_URL = "https://www.amazon.com/dp/B0H3LW82QK";

const ISSUES = [
  {
    key: "launch",
    href: AMAZON_LAUNCH_ISSUE_URL,
    src: "/images/amazoncover.png",
    alt: "Saat Saheli – Launch Issue magazine cover",
    caption: "Launch Issue",
    tilt: "left",
  },
  {
    key: "issue2",
    href: AMAZON_SERIES_URL,
    src: "/images/issue2cover.jpg",
    alt: "Saat Saheli – Issue 2, Summer Special (July–August) magazine cover",
    caption: "Issue 2 · Jul–Aug",
    tilt: "right",
  },
];

/**
 * The printed issues, fanned out like a small magazine stack, each cover
 * linking to its Amazon listing. Shared by the logged-out home hero promo and
 * the logged-in home magazine panel so the two cannot drift apart as issues
 * ship.
 */
export default function PrintedIssueCovers() {
  return (
    <div className="printed-issues">
      {ISSUES.map((issue) => (
        <a
          key={issue.key}
          className="printed-issues-link"
          href={issue.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src={issue.src}
            alt={issue.alt}
            className={`printed-issues-cover printed-issues-cover--${issue.tilt}`}
            loading="lazy"
          />
          <span className="printed-issues-cap">{issue.caption}</span>
        </a>
      ))}
    </div>
  );
}
