import React from 'react';
import { Link } from 'react-router-dom';
import saraswati from './saraswati.png';
import Dropdown from './Dropdown';
const welcomeMessage = process.env.REACT_APP_WELCOME_MESSAGE; 
const options = [
  { label: 'Contact Us', value: 'ContactUs' },
  { label: 'Sile Policies', value: 'SilePolicies' },
  { label: 'Feedback', value: 'Feedback' },
];
const handleDropdownSelect = (selectedOption) => {
   console.log('Selected:', selectedOption);
   // You can perform further actions with the selected option here
 };
const Header = () => (
  <header style={{ padding: '1rem', backgroundColor: '#f0f0f0' }}>
  <div className="grid-container">
	  <div className="grid-item">
		  <img src={saraswati} className="App-logo2" alt="saraswati-logo" />
	 </div>
	 <div>
	 </div>
	  <div className="grid-item">
		    <nav>
			<Link to="/Login">Login</Link> |
		      <Link to="/">Home</Link> | <Link to="/about">About</Link> | 
			  <Link to="/Logout">Logout</Link> |
			  <Dropdown options={options} onSelect={handleDropdownSelect} />
			| {welcomeMessage}
		    </nav>
	  </div>
	</div>
  </header>
);

export default Header;