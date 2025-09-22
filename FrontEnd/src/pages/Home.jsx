import FlipBook from "../FlipBook";
import { Link } from 'react-router-dom';
import React, { useState } from "react";
import '../App.css';


function Home() {
	const [query, setQuery] = useState('');
  	return (
		<div>

<div>
	<div className="App">
	<h1>My Flipbook</h1>
	   <Link 
		   to={{
		       pathname: "/create",
		       search: "?query=string",
		       hash: "#hash",
		     }}
	   /> 
	   </div>
	  	 <div>
		   Search by Book id :
		   <input
		       type="text"
		       className="border p-2 w-full mb-4"
		       placeholder="Search..."
			   value = {query}
			   onChange={(e) => setQuery(e.target.value)}
		     />
			  </div>
  		   <FlipBook bookId={query} />
		   </div>
</div>
  );
}
export default Home;