import React from 'react';
import saraswati from './saraswati.png';
import './sidebar.css'; // Import the CSS file for styling

const Sidebar = ({ isOpen, toggleSidebar }) => {
  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <button className="toggle-button" onClick={toggleSidebar}>
        {isOpen ? 'Close' : 'Open'} Menu
      </button>
      <nav>
		  <div className="grid-item">
	  		  <img src={saraswati} className="App-logo2" alt="saraswati-logo" />
	  	 </div>
        <ul className="grid-item">
          <li><a href="/">Home</a></li>
          <li><a href="/about">About</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;