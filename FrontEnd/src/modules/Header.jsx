import React from 'react';
import { Link } from 'react-router-dom';
import saraswati from './saraswati.png';
import Dropdown from './Dropdown';
import './Header.css';

const welcomeMessage = process.env.REACT_APP_WELCOME_MESSAGE;
const options = [
  { label: 'Contact Us', value: 'ContactUs' },
  { label: 'Site Policies', value: 'SitePolicies' },
  { label: 'Feedback', value: 'Feedback' },
];
const handleDropdownSelect = (selectedOption) => {
  console.log('Selected:', selectedOption);
};

const Header = () => (
  <header className="site-header" role="banner">
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <div className="header-container">
      <div className="header-logo">
        <img src={saraswati} className="header-logo-img" alt="SaatSaheli Saraswati logo" />
      </div>
      <nav className="header-nav" role="navigation" aria-label="Main navigation">
        <Link to="/Login" className="nav-link">Login</Link>
        <Link to="/" className="nav-link">Home</Link>
        <Link to="/about" className="nav-link">About</Link>
        <Link to="/books" className="nav-link">Books</Link>
        <Link to="/Logout" className="nav-link">Logout</Link>
        <Dropdown options={options} onSelect={handleDropdownSelect} />
        {welcomeMessage && <span className="welcome-msg" aria-live="polite">{welcomeMessage}</span>}
      </nav>
    </div>
  </header>
);

export default Header;
