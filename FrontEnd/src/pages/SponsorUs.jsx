import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import api from "../utils/api";
import ReCAPTCHA from "react-google-recaptcha";
// SponsorUs reuses Advertise's typography, card, and form styles. The CSS is
// generic enough that the .advertise-* class names stay readable on this page.
// Sponsor-specific overrides go in SponsorUs.css (loaded after Advertise.css).
import "./Advertise.css";
import "./SponsorUs.css";

// Empty string = same-origin (prod Docker build sets REACT_APP_API_URL=""), so
// requests go to a relative /api/... path. Local dev sets an absolute URL.
const API_BASE = process.env.REACT_APP_API_URL || "";
const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
const INQUIRY_EMAIL = "avikaventures.info@gmail.com";

const SITE_PACKAGES = [
  {
    key: "Friend",
    name: "Friend of SaatSaheli",
    price: "$250",
    cadence: "/ year",
    blurb: "For individual supporters and small patrons who believe in the community.",
    features: [
      "Your name on our /sponsors page",
      "Thank-you mention in a quarterly newsletter",
      "Early access to new magazine issues",
    ],
    accent: false,
  },
  {
    key: "Community",
    name: "Community Sponsor",
    price: "$750",
    cadence: "/ year",
    blurb: "For local businesses, classes, or small brands aligning with a creative community.",
    features: [
      "Your logo in the SaatSaheli footer (every page)",
      "Featured profile on /sponsors page with website link",
      "1 social media thank-you per quarter",
      "Quarterly impact update",
    ],
    accent: true,
  },
  {
    key: "Founding",
    name: "Founding Sponsor",
    price: "$1,500",
    cadence: "/ year",
    blurb: "For brands that want to anchor SaatSaheli's growth and sit at the front of the room.",
    features: [
      "Prominent footer logo placement (top of strip)",
      "Dedicated thank-you panel on the home page",
      "1 sponsored long-form article per year",
      "Newsletter banner mention",
      "Co-branded community event opportunity",
    ],
    accent: false,
  },
];

const ISSUE_PACKAGES = [
  {
    key: "Issue",
    name: "Magazine Issue Sponsor",
    price: "$300",
    cadence: "/ issue",
    blurb: '"Brought to you by [your brand]" credit on the issue cover and back page.',
    features: [
      "Cover credit + back-page thank-you",
      "Logo on the issue's landing page on saatsaheli.com",
      "1 social mention when the issue ships",
    ],
    accent: false,
  },
  {
    key: "Section",
    name: "Section Sponsor",
    price: "$150",
    cadence: "/ section / issue",
    blurb: "Sponsor a single section — recipes, poetry, kids' stories — for one issue.",
    features: [
      "Section-header credit (e.g., “Recipes section sponsored by…”)",
      "Logo placement at the top of the section",
      "Mention in the issue's social posts",
    ],
    accent: false,
  },
  {
    key: "Podcast",
    name: "Podcast Episode Sponsor",
    price: "$100",
    cadence: "/ episode",
    blurb: "30-second pre-roll mention on a SaatSaheli podcast episode.",
    features: [
      "Pre-roll audio credit",
      "Show-notes link to your site",
      "Cross-post mention on the episode's web page",
    ],
    accent: false,
  },
];

const CUSTOM = {
  key: "Custom",
  name: "Tailored Sponsorship",
  blurb: "Festival, event, contest, or multi-issue partnerships. Tell us what you have in mind.",
  features: [
    "Multi-issue or annual content sponsorships",
    "Festival or campaign tie-ins",
    "Co-branded community events",
    "Anything you can imagine — let's design it together",
  ],
};

const VALUE_PROPS = [
  "Family-friendly, creator-driven Hindi-English audience",
  "Writers, artists, homemakers, teachers, and small business owners",
  "Magazine, podcast, articles, recipes, galleries — across surfaces",
  "Community-first — we only feature sponsors that fit our values",
];

const SponsorUs = () => {
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [packageInterest, setPackageInterest] = useState("Community");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const recaptchaRef = useRef(null);
  const [payingKey, setPayingKey] = useState("");
  const [payError, setPayError] = useState("");

  const choosePackage = (key) => {
    setPackageInterest(key);
    setSent(false);
    setError("");
    setTimeout(() => {
      const f = document.getElementById("sponsor-form");
      if (f) f.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handlePaySponsor = async (pkg) => {
    setPayError("");
    const amount = Number(String(pkg.price).replace(/[^0-9.]/g, ""));
    if (!amount || isNaN(amount)) {
      setPayError("This package isn't available for online payment — please use the inquiry form below.");
      return;
    }
    // Annual site packages renew yearly; per-issue / per-episode are one-time.
    const frequency = /year/i.test(pkg.cadence || "") ? "annual" : "one_time";
    setPayingKey(pkg.key);
    try {
      const res = await api.post(`/api/support/create-checkout-session`, {
        purpose: "sponsor",
        amount,
        currency: "usd",
        frequency,
        label: pkg.name,
        cancelPath: "/sponsor-us",
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setPayError("Could not start checkout. Please try again.");
        setPayingKey("");
      }
    } catch (err) {
      setPayError(err.response?.data?.error || "Could not start checkout. Please try again.");
      setPayingKey("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in your name, email, and a short message.");
      return;
    }
    if (RECAPTCHA_SITE_KEY && !recaptchaToken) {
      setError("Please complete the reCAPTCHA.");
      return;
    }

    const body = [
      `Sponsorship interest: ${packageInterest}`,
      business.trim() ? `Brand / organization: ${business.trim()}` : null,
      phone.trim() ? `Phone: ${phone.trim()}` : null,
      "",
      message.trim(),
    ].filter(line => line !== null).join("\n");

    setSending(true);
    try {
      await axios.post(`${API_BASE}/api/contact`, {
        name: name.trim(),
        email: email.trim(),
        subject: `Sponsor SaatSaheli — Inquiry (${packageInterest})`,
        message: body,
        // Honeypot kept for legacy bot detection; real defense is reCAPTCHA + rate limit.
        website: "",
        recaptchaToken,
      });
      setSent(true);
      setName("");
      setBusiness("");
      setEmail("");
      setPhone("");
      setMessage("");
      setRecaptchaToken("");
      recaptchaRef.current?.reset();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send. Please try again or email us directly.");
      setRecaptchaToken("");
      recaptchaRef.current?.reset();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="advertise-page sponsor-page">
      <header className="advertise-hero">
        <p className="advertise-eyebrow">Sponsor SaatSaheli</p>
        <h1 className="advertise-h1">
          Help us tell the stories that matter
        </h1>
        <p className="advertise-lede">
          SaatSaheli is a creative home for writers, artists, homemakers, and
          everyday creators. Sponsors keep this community going — and get
          their brand standing alongside it.
        </p>
      </header>

      <section className="sponsor-value" aria-label="Why sponsor">
        <h2 className="advertise-placements-h2">Why sponsor us</h2>
        <ul className="advertise-placements-grid">
          {VALUE_PROPS.map(v => (
            <li key={v} className="advertise-placement-pill">
              <span className="advertise-placement-tick" aria-hidden="true">✓</span>
              {v}
            </li>
          ))}
        </ul>
      </section>

      {payError && (
        <div className="advertise-error sponsor-pay-error" role="alert">{payError}</div>
      )}

      <section aria-label="Site sponsorship packages">
        <header className="sponsor-section-head">
          <p className="advertise-eyebrow">Site sponsorship</p>
          <h2 className="advertise-placements-h2">Annual partnerships</h2>
          <p className="advertise-placements-lede">
            Your brand alongside the platform — every page, every reader, every issue.
          </p>
        </header>
        <div className="advertise-grid">
          {SITE_PACKAGES.map(pkg => (
            <article key={pkg.key} className={`advertise-card${pkg.accent ? " advertise-card-accent" : ""}`}>
              {pkg.accent && <div className="advertise-card-ribbon">Most popular</div>}
              <h3 className="advertise-card-name">{pkg.name}</h3>
              <p className="advertise-card-price">
                <span className="advertise-card-price-amount">{pkg.price}</span>
                <span className="advertise-card-price-cadence">{pkg.cadence}</span>
              </p>
              <p className="advertise-card-blurb">{pkg.blurb}</p>
              <ul className="advertise-card-features">
                {pkg.features.map((f, i) => (
                  <li key={i}>
                    <span className="advertise-card-tick" aria-hidden="true">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="sponsor-card-actions">
                <button
                  type="button"
                  className="advertise-card-cta"
                  onClick={() => handlePaySponsor(pkg)}
                  disabled={payingKey === pkg.key}
                >
                  {payingKey === pkg.key ? "Redirecting…" : `Sponsor now — ${pkg.price}/yr`}
                </button>
                <button
                  type="button"
                  className="advertise-card-cta advertise-card-cta-ghost"
                  onClick={() => choosePackage(pkg.key)}
                >
                  Inquire first
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-label="Magazine and podcast sponsorship packages">
        <header className="sponsor-section-head">
          <p className="advertise-eyebrow">Magazine + Podcast</p>
          <h2 className="advertise-placements-h2">Per-issue and per-episode sponsorship</h2>
          <p className="advertise-placements-lede">
            Lower commitment, sharper focus — sponsor a single magazine issue, section, or podcast episode.
          </p>
        </header>
        <div className="advertise-grid">
          {ISSUE_PACKAGES.map(pkg => (
            <article key={pkg.key} className="advertise-card">
              <h3 className="advertise-card-name">{pkg.name}</h3>
              <p className="advertise-card-price">
                <span className="advertise-card-price-amount">{pkg.price}</span>
                <span className="advertise-card-price-cadence">{pkg.cadence}</span>
              </p>
              <p className="advertise-card-blurb">{pkg.blurb}</p>
              <ul className="advertise-card-features">
                {pkg.features.map((f, i) => (
                  <li key={i}>
                    <span className="advertise-card-tick" aria-hidden="true">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="sponsor-card-actions">
                <button
                  type="button"
                  className="advertise-card-cta"
                  onClick={() => handlePaySponsor(pkg)}
                  disabled={payingKey === pkg.key}
                >
                  {payingKey === pkg.key ? "Redirecting…" : `Sponsor now — ${pkg.price}`}
                </button>
                <button
                  type="button"
                  className="advertise-card-cta advertise-card-cta-ghost"
                  onClick={() => choosePackage(pkg.key)}
                >
                  Inquire first
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="advertise-custom" aria-label="Tailored sponsorship">
        <div className="advertise-custom-text">
          <h2 className="advertise-card-name">{CUSTOM.name}</h2>
          <p className="advertise-card-blurb">{CUSTOM.blurb}</p>
          <ul className="advertise-card-features">
            {CUSTOM.features.map((f, i) => (
              <li key={i}>
                <span className="advertise-card-tick" aria-hidden="true">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          className="advertise-card-cta advertise-card-cta-ghost"
          onClick={() => choosePackage("Custom")}
        >
          Tell us about your idea
        </button>
      </section>

      <p style={{ textAlign: "center", color: "#6b7280", fontSize: "0.9rem", margin: "0 auto 1.5rem", maxWidth: 640 }}>
        Sponsorship payments are processed securely by Stripe and are non-refundable except for charges made in error. See our{" "}
        <Link to="/refund-policy" style={{ color: "#f59e0b", fontWeight: 600 }}>Refund Policy</Link>.
      </p>

      <section className="advertise-form-wrap" id="sponsor-form" aria-label="Sponsorship inquiry">
        <h2 className="advertise-form-title">Ready to support SaatSaheli?</h2>
        <p className="advertise-form-sub">
          Fill in your details below or email us at{" "}
          <a href={`mailto:${INQUIRY_EMAIL}?subject=Sponsorship%20Inquiry`} className="advertise-mail">
            {INQUIRY_EMAIL}
          </a>
          . We will respond within 24 hours.
        </p>

        {sent ? (
          <div className="advertise-sent" role="status">
            Thanks! Your sponsorship inquiry has been sent — we'll be in touch.
          </div>
        ) : (
          <form className="advertise-form" onSubmit={handleSubmit}>
            {error && <div className="advertise-error" role="alert">{error}</div>}

            <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
              <input
                type="text"
                name="ssh_alt_tagline"
                tabIndex="-1"
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            <div className="advertise-field-row">
              <div className="advertise-field">
                <label htmlFor="spn-name">Your name *</label>
                <input
                  id="spn-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
              <div className="advertise-field">
                <label htmlFor="spn-business">Brand / organization</label>
                <input
                  id="spn-business"
                  type="text"
                  value={business}
                  onChange={(e) => setBusiness(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="advertise-field-row">
              <div className="advertise-field">
                <label htmlFor="spn-email">Email *</label>
                <input
                  id="spn-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="advertise-field">
                <label htmlFor="spn-phone">Phone (optional)</label>
                <input
                  id="spn-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 555 5555"
                />
              </div>
            </div>

            <div className="advertise-field">
              <label htmlFor="spn-package">Sponsorship interest</label>
              <select
                id="spn-package"
                value={packageInterest}
                onChange={(e) => setPackageInterest(e.target.value)}
              >
                <optgroup label="Site sponsorship (annual)">
                  <option value="Friend">Friend of SaatSaheli — $250 / year</option>
                  <option value="Community">Community Sponsor — $750 / year</option>
                  <option value="Founding">Founding Sponsor — $1,500 / year</option>
                </optgroup>
                <optgroup label="Magazine + podcast">
                  <option value="Issue">Magazine Issue — $300 / issue</option>
                  <option value="Section">Section Sponsor — $150 / section / issue</option>
                  <option value="Podcast">Podcast Episode — $100 / episode</option>
                </optgroup>
                <option value="Custom">Tailored — let's talk</option>
              </select>
            </div>

            <div className="advertise-field">
              <label htmlFor="spn-message">Tell us about you *</label>
              <textarea
                id="spn-message"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What does your brand or organization do? Why does SaatSaheli's audience matter to you? Any timeline or campaign goals?"
                required
              />
            </div>

            {RECAPTCHA_SITE_KEY && (
              <div className="advertise-recaptcha">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                  onChange={(t) => setRecaptchaToken(t || "")}
                />
              </div>
            )}

            <button
              type="submit"
              className="advertise-submit"
              disabled={sending}
            >
              {sending ? "Sending…" : "Send inquiry"}
            </button>
            <p className="advertise-response-time">We will get back to you within 24 hours.</p>
          </form>
        )}
      </section>
    </div>
  );
};

export default SponsorUs;
