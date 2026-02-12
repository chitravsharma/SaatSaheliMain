import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import saraswati from './saraswati.png';
import { useAuth } from '../AuthContext';
import strings from '../constants/strings';
import './Header.css';

const welcomeMessage = process.env.REACT_APP_WELCOME_MESSAGE;

const Header = () => {
  const { user } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuRef = useRef(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile nav on route change (link click)
  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <header className="site-header" role="banner">
      <a className="skip-link" href="#main-content">{strings.header.skipLink}</a>
      <div className="header-container">
        <div className="header-top-row">
          <div className="header-logo">
            <img src={saraswati} className="header-logo-img" alt={strings.header.logoAlt} />
            <div className="header-brand">
              <span className="header-site-name">{strings.header.siteName}</span>
              <span className="header-tagline">{strings.header.siteTagline}</span>
            </div>
          </div>
          <button
            className="hamburger-btn"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-expanded={mobileNavOpen}
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
          >
            <span className={`hamburger-icon ${mobileNavOpen ? "hamburger-open" : ""}`} />
          </button>
        </div>
        <nav
          className={`header-nav ${mobileNavOpen ? "header-nav-open" : ""}`}
          role="navigation"
          aria-label="Main navigation"
        >
          <Link to="/" className="nav-link" onClick={closeMobileNav}>{strings.header.navHome}</Link>
          <Link to="/about" className="nav-link" onClick={closeMobileNav}>{strings.header.navAbout}</Link>
          <Link to="/books" className="nav-link" onClick={closeMobileNav}>{strings.header.navBooks}</Link>
          <Link to="/search" className="nav-link" onClick={closeMobileNav}>{strings.header.navSearch}</Link>
          {welcomeMessage && <span className="welcome-msg" aria-live="polite">{welcomeMessage}</span>}

          {user ? (
            <div className="header-user-menu" ref={menuRef}>
              <button
                className="header-user-btn"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                {user.name || user.email}
              </button>
              {userMenuOpen && (
                <div className="header-user-dropdown" role="menu">
                  <Link to="/account" className="header-user-item" role="menuitem" onClick={() => { setUserMenuOpen(false); closeMobileNav(); }}>
                    {strings.header.myAccount}
                  </Link>
                  <Link to="/logout" className="header-user-item" role="menuitem" onClick={() => { setUserMenuOpen(false); closeMobileNav(); }}>
                    {strings.header.logout}
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <Link to="/Login" className="nav-link" onClick={closeMobileNav}>{strings.header.navLogin}</Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
