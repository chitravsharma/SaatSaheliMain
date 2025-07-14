import logo from './logo.svg';
import './App.css';

import React, { useState, useEffect } from "react";
import FlipBook from "./FlipBook";
import { Link } from 'react-router-dom';

function App() {
	const [query, setQuery] = useState('');
  	return (
   		 <div className="App">
   		   <h1>My Flipbook</h1>
		   <Link 
			   to={{
			       pathname: "/create",
			       search: "?query=string",
			       hash: "#hash",
			     }}
		   />
		   Search by Book id :
		   <input
		       type="text"
		       className="border p-2 w-full mb-4"
		       placeholder="Search..."
			   value = {query}
			   onChange={(e) => setQuery(e.target.value)}
		     />
   		   <FlipBook bookId={query} />
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

