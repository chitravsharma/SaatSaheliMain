import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import siteLogo from './SaatSaheliLogo.jpg';
import { useAuth } from '../AuthContext';
import { useStrings, useLanguage } from '../LanguageContext';
import './Header.css';

const welcomeMessage = process.env.REACT_APP_WELCOME_MESSAGE;

const Header = () => {
  const { user } = useAuth();
  const strings = useStrings();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [writingDropdownOpen, setWritingDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("");
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim() && !searchType) return;
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.append("q", searchQuery.trim());
    if (searchType) params.append("type", searchType);
    navigate(`/search?${params.toString()}`);
    closeMobileNav();
  };

  return (
    <header className="site-header" role="banner">
      <a className="skip-link" href="#main-content">{strings.header.skipLink}</a>
      <div className="header-container">
        <div className="header-top-row">
          <Link to="/" className="header-logo" onClick={closeMobileNav}>
            <img src={siteLogo} className="header-logo-img" alt={strings.header.logoAlt} />
            <div className="header-brand">
              <span className="header-site-name">{language === 'hi' ? '' : 'SAA7 SAHELI'}</span>
              {language === 'hi' && <span className="header-site-name-hi">सात सहेली</span>}
              <span className="header-tagline">{language === 'hi' ? 'जुनून और रचनात्मकता का समुदाय!' : 'A Community for Passion and Creativity!'}</span>
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
            Home
          </Link>
          <Link to="/about" className="nav-link" onClick={closeMobileNav}>
            <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            {strings.header.navAbout}
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
          {user && (
            <Link to="/account" className="nav-link" onClick={closeMobileNav}>
              <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              My Account
            </Link>
          )}
          {user && (
            <Link to="/help-support" className="nav-link" onClick={closeMobileNav}>
              <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 100 20 10 10 0 000-20z"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Need Help in Content Creation
            </Link>
          )}
          {user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
            <Link to="/admin" className="nav-link" onClick={closeMobileNav}>
              <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              {strings.header.navAdmin || "Admin"}
            </Link>
          )}
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
                  <Link to="/help-support" className="header-user-item" role="menuitem" onClick={() => { setUserMenuOpen(false); closeMobileNav(); }}>
                    Help & Support
                  </Link>
                  <Link to="/pricing" className="header-user-item" role="menuitem" onClick={() => { setUserMenuOpen(false); closeMobileNav(); }}>
                    Upgrade
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
              Login / SignUp
            </Link>
          )}

          <select
            className="header-lang-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label={strings.header.language}
          >
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="bn">বাংলা</option>
            <option value="ta">தமிழ்</option>
            <option value="te">తెలుగు</option>
            <option value="mr">मराठी</option>
            <option value="gu">ગુજરાતી</option>
            <option value="kn">ಕನ್ನಡ</option>
            <option value="ml">മലയാളം</option>
            <option value="pa">ਪੰਜਾਬੀ</option>
            <option value="or">ଓଡ଼ିଆ</option>
            <option value="ur">اردو</option>
          </select>

          <form className="header-search-form" onSubmit={handleSearchSubmit}>
            <select
              className="header-search-type"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
            >
              <option value="">All</option>
              <option value="book">Book</option>
              <option value="poem">Poem</option>
              <option value="article">Article</option>
              <option value="blog">Blog</option>
              <option value="author">Author</option>
              <option value="Art">Art</option>
              <option value="Music">Music</option>
              <option value="Tech">Tech</option>
              <option value="Creativity">Creativity</option>
              <option value="Community">Community</option>
            </select>
            <input
              type="text"
              className="header-search-input"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="header-search-btn" aria-label="Search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
};

export default Header;
