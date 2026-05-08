import React, { useRef, useState } from "react";
import axios from "axios";
import ReCAPTCHA from "react-google-recaptcha";
import "./Advertise.css";

const API_BASE = process.env.REACT_APP_API_URL;
const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
const INQUIRY_EMAIL = "avikaventures.info@gmail.com";

const PACKAGES = [
  {
    key: "Starter",
    name: "Starter Package",
    price: "$25",
    cadence: "/ month",
    blurb: "Best for small businesses and first-time advertisers.",
    features: [
      "1 small banner ad on website",
      "Ad shown on selected pages",
      "Basic business name + link",
      "Monthly performance update",
    ],
    accent: false,
  },
  {
    key: "Growth",
    name: "Growth Package",
    price: "$50",
    cadence: "/ month",
    blurb: "Best for local businesses, classes, boutiques, artists, and services.",
    features: [
      "Medium banner ad on homepage or magazine pages",
      "Business logo + short message",
      "Link to website / social page",
      "1 social media mention per month",
    ],
    accent: true,
  },
  {
    key: "Featured",
    name: "Featured Package",
    price: "$100",
    cadence: "/ month",
    blurb: "Best for brands that want more visibility.",
    features: [
      "Large featured banner placement",
      "Homepage visibility",
      "Magazine / portal page placement",
      "2 social media mentions per month",
      "Short brand highlight write-up",
    ],
    accent: false,
  },
];

const CUSTOM = {
  key: "Custom",
  name: "Custom Sponsorship",
  blurb: "For event sponsors, magazine sponsors, podcast sponsors, or long-term partnerships.",
  features: [
    "Custom banner placement",
    "Podcast or magazine mention",
    "Sponsored article option",
    "Festival or campaign sponsorship",
  ],
};

// Where ads can appear on the SaatSaheli surface area. Shown decoratively;
// admins fulfill the actual placement after the inquiry comes in.
const PLACEMENTS = [
  "Homepage banner",
  "Magazine issue pages",
  "Article pages",
  "Podcast",
  "Creator gallery pages",
  "Newsletter / social mention",
];

const Advertise = () => {
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [packageInterest, setPackageInterest] = useState("Starter");
  const [placementsSelected, setPlacementsSelected] = useState([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const recaptchaRef = useRef(null);

  const choosePackage = (key) => {
    setPackageInterest(key);
    // If the user already submitted an inquiry, clicking any package CTA
    // (Starter / Growth / Featured / Custom) reopens the form so they can
    // submit another one.
    setSent(false);
    setError("");
    setTimeout(() => {
      const f = document.getElementById("advertise-form");
      if (f) f.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
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

    // Body bundles business + phone + package + selected placements into the
    // message so admins see everything in one place inside Support Queries.
    const body = [
      `Package interest: ${packageInterest}`,
      business.trim() ? `Business: ${business.trim()}` : null,
      phone.trim() ? `Phone: ${phone.trim()}` : null,
      placementsSelected.length ? `Preferred placements: ${placementsSelected.join(", ")}` : null,
      "",
      message.trim(),
    ].filter(line => line !== null).join("\n");

    setSending(true);
    try {
      await axios.post(`${API_BASE}/api/contact`, {
        name: name.trim(),
        email: email.trim(),
        subject: `Advertise with SaatSaheli — Submission (${packageInterest})`,
        message: body,
        // Honeypot is always empty in the SPA payload — autofill/extensions
        // keep filling the hidden field, so we ignore the local state and let
        // reCAPTCHA + rate limit do the bot defense. The field stays in DOM
        // to bait dumb bots that scrape the HTML and POST what they see.
        website: "",
        recaptchaToken,
      });
      setSent(true);
      setName("");
      setBusiness("");
      setEmail("");
      setPhone("");
      setMessage("");
      setPlacementsSelected([]);
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
    <div className="advertise-page">
      <header className="advertise-hero">
        <p className="advertise-eyebrow">Advertise with SaatSaheli</p>
        <h1 className="advertise-h1">
          Reach a creative, family-friendly community
        </h1>
        <p className="advertise-lede">
          Of readers, writers, artists, homemakers, teachers, and small business
          owners. Pick a package that fits — or design a custom sponsorship with us.
        </p>
      </header>

      <section className="advertise-grid" aria-label="Advertising packages">
        {PACKAGES.map(pkg => (
          <article key={pkg.key} className={`advertise-card${pkg.accent ? " advertise-card-accent" : ""}`}>
            {pkg.accent && <div className="advertise-card-ribbon">Most popular</div>}
            <h2 className="advertise-card-name">{pkg.name}</h2>
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
            <button
              type="button"
              className="advertise-card-cta"
              onClick={() => choosePackage(pkg.key)}
            >
              Get started
            </button>
          </article>
        ))}
      </section>

      <section className="advertise-placements" aria-label="Placement options">
        <div className="advertise-placements-text">
          <p className="advertise-eyebrow">Where ads can appear</p>
          <h2 className="advertise-placements-h2">Flexible placements for different goals</h2>
          <p className="advertise-placements-lede">
            Pick visibility on SaatSaheli pages where readers are already exploring
            stories, articles, creative galleries, podcasts, and magazine content.
          </p>
        </div>
        <ul className="advertise-placements-grid">
          {PLACEMENTS.map(p => (
            <li key={p} className="advertise-placement-pill">
              <span className="advertise-placement-tick" aria-hidden="true">✓</span>
              {p}
            </li>
          ))}
        </ul>
      </section>

      <section className="advertise-custom" aria-label="Custom sponsorship">
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

      <section className="advertise-form-wrap" id="advertise-form" aria-label="Advertising inquiry">
        <h2 className="advertise-form-title">Interested? Let's talk.</h2>
        <p className="advertise-form-sub">
          Fill in your details below or email us at{" "}
          <a href={`mailto:${INQUIRY_EMAIL}?subject=Advertising%20Inquiry`} className="advertise-mail">
            {INQUIRY_EMAIL}
          </a>
          . We will get back to you within 24 hours.
        </p>

        {sent ? (
          <div className="advertise-sent" role="status">
            Thanks! Your inquiry has been sent — we'll be in touch.
          </div>
        ) : (
          <form className="advertise-form" onSubmit={handleSubmit}>
            {error && <div className="advertise-error" role="alert">{error}</div>}

            {/* Honeypot — hidden from users, bots fill it */}
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
                <label htmlFor="adv-name">Your name *</label>
                <input
                  id="adv-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
              <div className="advertise-field">
                <label htmlFor="adv-business">Business / brand name</label>
                <input
                  id="adv-business"
                  type="text"
                  value={business}
                  onChange={(e) => setBusiness(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="advertise-field-row">
              <div className="advertise-field">
                <label htmlFor="adv-email">Email *</label>
                <input
                  id="adv-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="advertise-field">
                <label htmlFor="adv-phone">Phone (optional)</label>
                <input
                  id="adv-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 555 5555"
                />
              </div>
            </div>

            <div className="advertise-field">
              <label htmlFor="adv-package">Package interest</label>
              <select
                id="adv-package"
                value={packageInterest}
                onChange={(e) => setPackageInterest(e.target.value)}
              >
                <option value="Starter">Starter — $25 / month</option>
                <option value="Growth">Growth — $50 / month</option>
                <option value="Featured">Featured — $100 / month</option>
                <option value="Custom">Custom Sponsorship</option>
              </select>
            </div>

            <div className="advertise-field">
              <label>Preferred placements (optional)</label>
              <div className="advertise-checkbox-grid">
                {PLACEMENTS.map(p => {
                  const checked = placementsSelected.includes(p);
                  return (
                    <label
                      key={p}
                      className={`advertise-checkbox${checked ? " advertise-checkbox-on" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setPlacementsSelected(prev => [...prev, p]);
                          else setPlacementsSelected(prev => prev.filter(x => x !== p));
                        }}
                      />
                      <span>{p}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="advertise-field">
              <label htmlFor="adv-message">Tell us about your business *</label>
              <textarea
                id="adv-message"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What do you sell or offer? Any campaign goals, timeline, or questions?"
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

export default Advertise;
