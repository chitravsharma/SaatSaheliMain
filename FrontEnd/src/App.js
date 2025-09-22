import './App.css';

import React, { useState, useEffect, myRef, useRef  } from "react";

import Header from './modules/Header';
import Footer from './modules/Footer';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import Contacts from './pages/Contacts';
import Sidebar from './modules/Sidebar';


function App() {
	/*const [query, setQuery] = useState('');*/
	const myRef = useRef('');
	useEffect(() => {
	  if (myRef.current) {
	    // It's safe to use the ref here
	    myRef.current.focus();
	  } else {
	    console.warn("Ref is still null after mount.");
	  }
	}, []); 

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
