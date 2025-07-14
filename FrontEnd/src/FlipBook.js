import React, { useEffect, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import axios from "axios";

function FlipBook({ bookId }) {
	const [book, setBook] = useState(null);
  	const [pages, setPages] = useState([]);

  useEffect(() => {
    axios.get(`http://localhost:8081/api/books/${bookId}/pages`)
      .then(res => setPages(res.data))
      .catch(err => console.error(err));
  }, [bookId]);
  
  const createBook = async () => {
    const res = await axios.post('/api/books/create?title=My Flipbook');
    setBook(res.data);
    setPages(res.data.pages);
  };

  const fetchPages = async (bookId) => {
    const res = await axios.get(`/api/books/${bookId}/pages`);
    setPages(res.data);
  };

  const handleUpload = async (pageId, file) => {
    const formData = new FormData();
    formData.append("file", file);

    await fetch(`http://localhost:8081/api/pages/${pageId}/upload-image`, {
      method: "POST",
      body: formData,
    });
  };

  return (
    <div className="center-container">
      <HTMLFlipBook width={400} height={500}>
 		{pages.map((page, index) => (
          <div key={index} className="card-box">
                    <h2>Page {page.pageNumber}</h2>
                    <p>{page.content}
                        {"  "}{bookId}</p>
					<p>{page.imageUrl && (
						  <img src={page.imageUrl} alt="Page" style={{ maxWidth: '100%', height: 'auto' }} />
						  )}
						  </p>
                </div>
				
        ))}
		{/*<div className="page">Cover Page</div>
        <div className="page">Page 1</div>
        <div className="page">Page 2</div>
        <div className="page">Page 3</div>
        <div className="page">Back Cover</div>*/} 
      </HTMLFlipBook>
    </div>
  );
}
export default FlipBook;
