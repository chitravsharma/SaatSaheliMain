import React from "react";

// Site-wide promo bar. The whole bar is clickable and opens the registration
// form in a new tab. Update FORM_URL / the text to change the campaign.
const FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSdxZ18rXZ2FrHvWHtHrr8MjT-4vPpO8eXfB5WIKI4IfB_A9mQ/viewform?usp=sharing&ouid=112044744638524551699";

export default function PromoBanner() {
  return (
    <a
      href={FORM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="promo-banner"
      aria-label="Online Hindi Classes starting soon — register today"
      style={{
        display: "block",
        background: "#8b2e5f",
        color: "#fff",
        padding: "12px 20px",
        textAlign: "center",
        fontFamily: "Arial, sans-serif",
        fontSize: "clamp(14px, 3.4vw, 18px)",
        fontWeight: 600,
        textDecoration: "none",
        lineHeight: 1.35,
      }}
    >
      📚 <strong>Online Hindi Classes</strong> • Starting Soon •{" "}
      <span style={{ color: "#ffd86b", fontWeight: "bold", textDecoration: "underline" }}>
        Register Today!
      </span>
    </a>
  );
}
