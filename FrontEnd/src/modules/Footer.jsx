import React from 'react';
import { Link } from 'react-router-dom';
import { useStrings } from '../LanguageContext';
import { useAuth } from '../AuthContext';
import './Footer.css';

// Footer sponsor logo strip. Hard-coded for now — populate as sponsors come on board.
// Each entry: { name (alt text), logo (path under /public or absolute URL), href }.
// Strip auto-hides when SPONSORS is empty, so it's a no-op until the first sponsor signs.
const SPONSORS = [
  // { name: "Example Brand", logo: "/images/sponsors/example.png", href: "https://example.com" },
];

const Footer = () => {
  const strings = useStrings();
  const { user } = useAuth();
  const isAdmin = user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN");
  return (
    <footer className="site-footer" role="contentinfo">
      {SPONSORS.length > 0 && (
        <div className="footer-sponsors" aria-label="Our sponsors">
          <span className="footer-sponsors-label">Our sponsors</span>
          <ul className="footer-sponsors-list">
            {SPONSORS.map(s => (
              <li key={s.name}>
                <a href={s.href} target="_blank" rel="noopener sponsored" title={s.name}>
                  <img src={s.logo} alt={s.name} className="footer-sponsor-logo" loading="lazy" />
                </a>
              </li>
            ))}
          </ul>
          <Link to="/sponsor-us" className="footer-sponsors-link">Become a sponsor →</Link>
        </div>
      )}
      <nav className="footer-links" aria-label="Footer navigation">
        <Link to="/" className="footer-link">Home</Link>
        <Link to="/about" className="footer-link">{strings.footer.about}</Link>
        <Link to="/contacts" className="footer-link">{strings.footer.contactUs}</Link>
        <Link to="/advertise" className="footer-link">Advertise</Link>
        <Link to="/sponsor-us" className="footer-link">Sponsor us</Link>
        <Link to="/policies" className="footer-link">{strings.footer.sitePolicies}</Link>
        <Link to="/feedback" className="footer-link">{strings.footer.feedback}</Link>
        <Link to="/manual" className="footer-link">Help</Link>
        {isAdmin && <Link to="/admin-manual" className="footer-link">Admin Manual</Link>}
      </nav>
      <p>{strings.footer.copyright}</p>
    </footer>
  );
};

export default Footer;
