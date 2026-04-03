import React from 'react';
import { Link } from 'react-router-dom';
import siteLogo from './SaatSaheliLogo.jpg';
import './sidebar.css'; // Import the CSS file for styling

const Sidebar = ({ isOpen, toggleSidebar }) => {
  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <button className="toggle-button" onClick={toggleSidebar}>
        {isOpen ? 'Close' : 'Open'} Menu
      </button>
      <nav>
		  <div className="grid-item">
	  		  <img src={siteLogo} className="App-logo2" alt="SaatSaheli logo" />
	  	 </div>
        <ul className="grid-item">
          <li><Link to="/" onClick={toggleSidebar}>Home</Link></li>
          <li><Link to="/about" onClick={toggleSidebar}>About</Link></li>
          <li><Link to="/contacts" onClick={toggleSidebar}>Contact</Link></li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;