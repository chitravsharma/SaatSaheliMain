import React from 'react';
import { Link } from 'react-router-dom';
import { useStrings } from '../LanguageContext';
import './Footer.css';

const Footer = () => {
  const strings = useStrings();
  return (
    <footer className="site-footer" role="contentinfo">
      <nav className="footer-links" aria-label="Footer navigation">
        <Link to="/contacts" className="footer-link">{strings.footer.contactUs}</Link>
        <Link to="/policies" className="footer-link">{strings.footer.sitePolicies}</Link>
        <Link to="/contacts" className="footer-link">{strings.footer.feedback}</Link>
      </nav>
      <p>{strings.footer.copyright}</p>
    </footer>
  );
};

export default Footer;
