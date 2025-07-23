import logo from './logo.svg';
import './App.css';

import React, { useState, useEffect } from "react";

import Header from './modules/Header';
import Footer from './modules/Footer';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import Contacts from './pages/Contacts';
import Sidebar from './modules/Sidebar';


function App() {
	/*const [query, setQuery] = useState('');*/
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const toggleSidebar = () => {
	   setIsSidebarOpen(!isSidebarOpen);
	 };
  	return (
   		 <div className="App">
		 <Header />
		 <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/about" element={<About />} />
         </Routes>
		 <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
		 <div className={`main-content ${isSidebarOpen ? 'shifted' : ''}`}>
			 <main>
		       <p></p>
		     </main>
		 </div>
		
		   <Footer />
   		 </div>
  );
}


export default App;


/*function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}*/