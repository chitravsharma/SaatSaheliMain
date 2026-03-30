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
  const [writingDropdownOpen, setWritingDropdownOpen] = useState(false);
  const menuRef = useRef(null);
  const writingMenuRef = useRef(null);

  // Close user menu and writing dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      if (writingMenuRef.current && !writingMenuRef.current.contains(e.target)) {
        setWritingDropdownOpen(false);
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
          <Link to="/" className="header-logo" onClick={closeMobileNav}>
            <img src={siteLogo} className="header-logo-img" alt={strings.header.logoAlt} />
            <div className="header-brand">
              <span className="header-tagline">Welcome to Saat Saheli</span>
              <span className="header-tagline">A Community for Passion and Creativity!</span>
            </div>
          </Link>
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
          <div className="header-writing-menu" ref={writingMenuRef}>
            <button
              className="nav-link"
              onClick={() => setWritingDropdownOpen(!writingDropdownOpen)}
              aria-expanded={writingDropdownOpen}
              aria-haspopup="true"
            >
              <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              Writing
              <svg className="nav-dropdown-arrow" width="10" height="6" viewBox="0 0 10 6"><path d="M0 0l5 6 5-6z" fill="currentColor"/></svg>
            </button>
            {writingDropdownOpen && (
              <div className="header-writing-dropdown" role="menu">
                <Link to="/books" className="header-writing-item" role="menuitem" onClick={() => { setWritingDropdownOpen(false); closeMobileNav(); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
                  Books
                </Link>
                <Link to="/articles/poems" className="header-writing-item" role="menuitem" onClick={() => { setWritingDropdownOpen(false); closeMobileNav(); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                  Poems
                </Link>
                <Link to="/articles/articles" className="header-writing-item" role="menuitem" onClick={() => { setWritingDropdownOpen(false); closeMobileNav(); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  Articles
                </Link>
                <Link to="/articles/blogs" className="header-writing-item" role="menuitem" onClick={() => { setWritingDropdownOpen(false); closeMobileNav(); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                  Blogs
                </Link>
                <Link to="/podcasts" className="header-writing-item" role="menuitem" onClick={() => { setWritingDropdownOpen(false); closeMobileNav(); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                  Podcasts
                </Link>
              </div>
            )}
          </div>
          <Link to="/search" className="nav-link" onClick={closeMobileNav}>
            <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            {strings.header.navSearch}
          </Link>
          <Link to="/marketplace" className="nav-link" onClick={closeMobileNav}>
            <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
            Buy/Sell
          </Link>
          <Link to="/pricing" className="nav-link" onClick={closeMobileNav}>
            <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            Upgrade
          </Link>
          <Link to="/manual" className="nav-link" onClick={closeMobileNav}>
            <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Help
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
            <>
              <Link to="/Login" className="nav-link" onClick={closeMobileNav}>
                <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                {strings.header.navLogin}
              </Link>
              <Link to="/Login?mode=signup" className="nav-link nav-link-register" onClick={closeMobileNav}>
                <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                Create Account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
