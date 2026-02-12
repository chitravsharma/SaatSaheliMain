import React from 'react';
import strings from '../constants/strings';
import './Footer.css';

const Footer = () => (
  <footer className="site-footer" role="contentinfo">
    <p>{strings.footer.copyright}</p>
  </footer>
);

export default Footer;
