import React from 'react';
import { Link } from 'react-router-dom';
import siteLogo from './SaatSaheliLogo.jpg';
import './sidebar.css';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <button className="toggle-button" onClick={toggleSidebar}>
        {isOpen ? '✕' : '☰'}
      </button>

      <div className="sidebar-content">
        {/* Logo & Nav */}
        <nav className="sidebar-nav">
          <div className="sidebar-logo-wrap">
            <img src={siteLogo} className="sidebar-logo" alt="Saat Saheli logo" />
          </div>
          <ul className="sidebar-links">
            <li><Link to="/" onClick={toggleSidebar}>Home</Link></li>
            <li><Link to="/about" onClick={toggleSidebar}>About</Link></li>
            <li><Link to="/writers" onClick={toggleSidebar}>Writers</Link></li>
            <li><Link to="/galleries" onClick={toggleSidebar}>Galleries</Link></li>
            <li><Link to="/contacts" onClick={toggleSidebar}>Contact</Link></li>
            <li><Link to="/feedback" onClick={toggleSidebar}>Give Feedback</Link></li>
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
