import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import siteLogo from './SaatSaheliLogo.jpg';
import { useAuth } from '../AuthContext';
import { useCart } from '../contexts/CartContext';
import { useStrings, useLanguage } from '../LanguageContext';
import AdBanner from './AdBanner';
import './Header.css';

const welcomeMessage = process.env.REACT_APP_WELCOME_MESSAGE;

const Header = () => {
  const { user, flashAccount, dismissAccountFlash } = useAuth();
  const { cartCount } = useCart();
  const strings = useStrings();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [writingDropdownOpen, setWritingDropdownOpen] = useState(false);
  const [browseDropdownOpen, setBrowseDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("");
  const menuRef = useRef(null);
  const writingMenuRef = useRef(null);
  const browseMenuRef = useRef(null);

  // Close user menu and dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      if (writingMenuRef.current && !writingMenuRef.current.contains(e.target)) {
        setWritingDropdownOpen(false);
      }
      if (browseMenuRef.current && !browseMenuRef.current.contains(e.target)) {
        setBrowseDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile nav on route change (link click)
  const closeMobileNav = () => setMobileNavOpen(false);
  const closeBrowseDropdown = () => { setBrowseDropdownOpen(false); closeMobileNav(); };

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
              <span className="header-eyebrow">Create &nbsp;•&nbsp; Share &nbsp;•&nbsp; Inspire</span>
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

        <div className="header-ad-slot">
          <AdBanner placement="HEADER_TOP" />
        </div>

        <nav
          className={`header-nav ${mobileNavOpen ? "header-nav-open" : ""}`}
          role="navigation"
          aria-label="Main navigation"
        >
          <Link to="/podcasts" className="nav-link nav-link-podcast" onClick={closeMobileNav}>
            <svg className="nav-mic" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              {/* studio mic body with grille lines */}
              <rect x="9" y="2" width="6" height="12" rx="3" fill="#c9a84c"/>
              <path d="M9.5 5h5M9.5 7.5h5M9.5 10h5" stroke="#6b5414" strokeWidth="0.6" strokeLinecap="round"/>
              {/* arc stand */}
              <path d="M6 11v1a6 6 0 0012 0v-1" fill="none" stroke="#c9a84c" strokeWidth="1.8" strokeLinecap="round"/>
              {/* stand post + base */}
              <line x1="12" y1="18" x2="12" y2="22" stroke="#c9a84c" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="9" y1="22" x2="15" y2="22" stroke="#c9a84c" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <span>Weekly Podcast</span>
          </Link>
          <Link to="/" className="nav-link" onClick={closeMobileNav}>
            <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Home
          </Link>
          <Link to="/about" className="nav-link" onClick={closeMobileNav}>
            <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            {strings.header.navAbout}
          </Link>
          <Link to="/support" className="nav-link nav-link-support" onClick={closeMobileNav}>
            <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            Support us
          </Link>
          <div className="header-browse-menu" ref={browseMenuRef}>
            <button
              type="button"
              className="nav-link nav-link-browse"
              onClick={() => setBrowseDropdownOpen(!browseDropdownOpen)}
              aria-expanded={browseDropdownOpen}
              aria-haspopup="true"
            >
              <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Browse
              <svg className="nav-dropdown-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {browseDropdownOpen && (
              <div className="header-browse-dropdown" role="menu">
                <Link to="/magazine" className="header-browse-item" role="menuitem" onClick={closeBrowseDropdown}>
                  <svg className="nav-icon" style={{ color: "#8a3a24" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                  Magazine
                </Link>
                <Link to="/books" className="header-browse-item" role="menuitem" onClick={closeBrowseDropdown}>
                  <svg className="nav-icon" style={{ color: "#a0532b" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                  Books
                </Link>
                <Link to="/poems" className="header-browse-item" role="menuitem" onClick={closeBrowseDropdown}>
                  <svg className="nav-icon" style={{ color: "#7c3aed" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>
                  Poems
                </Link>
                <Link to="/articles" className="header-browse-item" role="menuitem" onClick={closeBrowseDropdown}>
                  <svg className="nav-icon" style={{ color: "#2c5d6b" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  Articles
                </Link>
                <Link to="/blogs" className="header-browse-item" role="menuitem" onClick={closeBrowseDropdown}>
                  <svg className="nav-icon" style={{ color: "#059669" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                  Blogs
                </Link>
                <Link to="/recipes" className="header-browse-item" role="menuitem" onClick={closeBrowseDropdown}>
                  <svg className="nav-icon" style={{ color: "#ea580c" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
                  Recipes
                </Link>
                <Link to="/podcasts" className="header-browse-item" role="menuitem" onClick={closeBrowseDropdown}>
                  <svg className="nav-icon" style={{ color: "#db2777" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                  Podcasts
                </Link>
                <Link to="/writers" className="header-browse-item" role="menuitem" onClick={closeBrowseDropdown}>
                  <svg className="nav-icon" style={{ color: "#d4a017" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
                  Writers
                </Link>
                <Link to="/writers?type=artist" className="header-browse-item" role="menuitem" onClick={closeBrowseDropdown}>
                  <svg className="nav-icon" style={{ color: "#ec4899" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.66 0 3-1.34 3-3 0-.78-.29-1.49-.78-2.03a1.5 1.5 0 0 1 1.06-2.56h1.84c2.7 0 4.88-2.18 4.88-4.88C22 5.96 17.52 2 12 2z"/></svg>
                  Artists
                </Link>
                <Link to="/galleries" className="header-browse-item" role="menuitem" onClick={closeBrowseDropdown}>
                  <svg className="nav-icon" style={{ color: "#0891b2" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  Galleries
                </Link>
                <Link to="/marketplace" className="header-browse-item" role="menuitem" onClick={closeBrowseDropdown}>
                  <svg className="nav-icon" style={{ color: "#2563eb" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                  Buy / Sell
                </Link>
                <Link to="/manual" className="header-browse-item" role="menuitem" onClick={closeBrowseDropdown}>
                  <svg className="nav-icon" style={{ color: "#64748b" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  User Manual
                </Link>
                <Link to="/advertise" className="header-browse-item" role="menuitem" onClick={closeBrowseDropdown}>
                  <svg className="nav-icon" style={{ color: "#dc2626" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
                  Advertise
                </Link>
              </div>
            )}
          </div>
          {user && (
            <Link to="/chat" className="nav-link" onClick={closeMobileNav}>
              <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              {strings.header.navChat || "Chat"}
            </Link>
          )}
          {user && (
            <Link
              to="/account"
              className={`nav-link${flashAccount ? " nav-link-flash" : ""}`}
              onClick={() => { dismissAccountFlash(); closeMobileNav(); }}
            >
              <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              My Account
            </Link>
          )}
          <Link to="/marketplace" className="nav-link" onClick={closeMobileNav} aria-label="Shop">
            <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l1.5-5h15L21 9"/><path d="M3 9h18v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9z"/><path d="M9 13h6"/></svg>
            Shop
          </Link>
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
                  <Link to="/marketplace/cart" className="header-user-item" role="menuitem" onClick={() => { setUserMenuOpen(false); closeMobileNav(); }}>
                    Cart{cartCount > 0 ? ` (${cartCount})` : ""}
                  </Link>
                  <Link to="/help-support" className="header-user-item" role="menuitem" onClick={() => { setUserMenuOpen(false); closeMobileNav(); }}>
                    Need help and Support
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

          {user && (
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
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
