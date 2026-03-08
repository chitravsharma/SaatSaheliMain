import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import siteLogo from './SaatSaheliLogo.jpg';
import { useAuth } from '../AuthContext';
import { useStrings, useLanguage } from '../LanguageContext';
import './Header.css';

const welcomeMessage = process.env.REACT_APP_WELCOME_MESSAGE;

const Header = () => {
  const { user } = useAuth();
  const strings = useStrings();
  const { language, setLanguage } = useLanguage();
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
            <img src={siteLogo} className="header-logo-img" alt={strings.header.logoAlt} />
            <div className="header-brand">
              <span className="header-site-name">{strings.header.siteName}</span>
              <span className="header-tagline">Welcome to Saat Saheli</span>
              <span className="header-tagline">A Community for Passion and Creativity!</span>
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
          <Link to="/" className="nav-link" onClick={closeMobileNav}>
            <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            {strings.header.navHome}
          </Link>
          <Link to="/about" className="nav-link" onClick={closeMobileNav}>
            <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            {strings.header.navAbout}
          </Link>
          <Link to="/books" className="nav-link" onClick={closeMobileNav}>
            <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
            {strings.header.navBooks}
          </Link>
          <Link to="/search" className="nav-link" onClick={closeMobileNav}>
            <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            {strings.header.navSearch}
          </Link>
          {user && (
            <Link to="/chat" className="nav-link" onClick={closeMobileNav}>
              <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              {strings.header.navChat || "Chat"}
            </Link>
          )}
          {user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
            <Link to="/admin" className="nav-link" onClick={closeMobileNav}>
              <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              {strings.header.navAdmin || "Admin"}
            </Link>
          )}
          {welcomeMessage && <span className="welcome-msg" aria-live="polite">{welcomeMessage}</span>}

          <select
            className="header-lang-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label={strings.header.language}
          >
            <option value="en">EN</option>
            <option value="hi">हिंदी</option>
          </select>

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
            <Link to="/Login" className="nav-link" onClick={closeMobileNav}>
              <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              {strings.header.navLogin}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
