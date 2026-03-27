import React from 'react';
import { Link } from 'react-router-dom';
import { useStrings } from '../LanguageContext';
import './Footer.css';

const Footer = () => {
  const strings = useStrings();
  return (
    <footer className="site-footer" role="contentinfo">
      <nav className="footer-links" aria-label="Footer navigation">
        <a href="https://docs.google.com/forms/d/e/1FAIpQLScQln_ha-l5z2LKD8dDYtbGQntL1l1pKLBkR-PFva9TmcUrjQ/viewform?usp=sharing&ouid=101412432976448402064" className="footer-link" target="_blank" rel="noopener noreferrer">{strings.footer.contactUs}</a>
        <Link to="/policies" className="footer-link">{strings.footer.sitePolicies}</Link>
        <a href="https://docs.google.com/forms/d/e/1FAIpQLSdzxyOUw7hPjSTAk7n5DiKFEErSXLDr3BCujP7LRG7qzWvV0A/viewform?usp=sharing&ouid=101412432976448402064" className="footer-link" target="_blank" rel="noopener noreferrer">{strings.footer.feedback}</a>
        <Link to="/manual" className="footer-link">Help</Link>
        <Link to="/admin-manual" className="footer-link">Admin Manual</Link>
      </nav>
      <p>{strings.footer.copyright}</p>
    </footer>
  );
};

export default Footer;
