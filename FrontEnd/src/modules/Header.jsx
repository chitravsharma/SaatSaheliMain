import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import saraswati from './saraswati.png';
import Dropdown from './Dropdown';
import { useAuth } from '../AuthContext';
import './Header.css';

const welcomeMessage = process.env.REACT_APP_WELCOME_MESSAGE;
const options = [
  { label: 'Contact Us', value: '/contacts' },
  { label: 'Site Policies', value: '/policies' },
  { label: 'Feedback', value: '/contacts' },
];

const Header = () => {
  const { user } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const handleDropdownSelect = (selectedOption) => {
    if (selectedOption?.value) {
      navigate(selectedOption.value);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="site-header" role="banner">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div className="header-container">
        <div className="header-logo">
          <img src={saraswati} className="header-logo-img" alt="SaatSaheli Saraswati logo" />
        </div>
        <nav className="header-nav" role="navigation" aria-label="Main navigation">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/about" className="nav-link">About</Link>
          <Link to="/books" className="nav-link">Books</Link>
          <Link to="/search" className="nav-link">Search</Link>
          <Dropdown options={options} onSelect={handleDropdownSelect} />
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
                  <Link to="/account" className="header-user-item" role="menuitem" onClick={() => setUserMenuOpen(false)}>
                    My Account
                  </Link>
                  <Link to="/logout" className="header-user-item" role="menuitem" onClick={() => setUserMenuOpen(false)}>
                    Logout
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <Link to="/Login" className="nav-link">Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
