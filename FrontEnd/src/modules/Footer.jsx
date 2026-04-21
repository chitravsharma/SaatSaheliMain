import React from 'react';
import { Link } from 'react-router-dom';
import { useStrings } from '../LanguageContext';
import { useAuth } from '../AuthContext';
import './Footer.css';

const Footer = () => {
  const strings = useStrings();
  const { user } = useAuth();
  const isAdmin = user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN");
  return (
    <footer className="site-footer" role="contentinfo">
      <nav className="footer-links" aria-label="Footer navigation">
        <Link to="/" className="footer-link">Home</Link>
        <Link to="/contacts" className="footer-link">{strings.footer.contactUs}</Link>
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
