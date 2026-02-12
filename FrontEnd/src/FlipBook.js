import React, { useEffect, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import axios from "axios";

// Convert Google Drive shareable URL to embeddable thumbnail
function driveUrlToThumbnail(url) {
  if (!url) return null;
  const match = url.match(/\/file\/d\/([^/]+)\//);
  if (match) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
  }
  return url;
}

// Parse JSON format string into style object
function parseFormat(formatStr) {
  if (!formatStr) return {};
  try {
    const parsed = JSON.parse(formatStr);
    const style = {};
    if (parsed.fontFamily) style.fontFamily = parsed.fontFamily;
    if (parsed.fontSize) style.fontSize = parsed.fontSize;
    if (parsed.color) style.color = parsed.color;
    return style;
  } catch {
    return {};
  }
}

function FlipBook({ bookId }) {
  const [pages, setPages] = useState([]);

  useEffect(() => {
    axios.get(`http://localhost:8081/api/books/${bookId}/pages`)
      .then(res => setPages(res.data))
      .catch(err => console.error(err));
  }, [bookId]);

  return (
    <div className="center-container">
      <HTMLFlipBook width={400} height={500}>
        {pages.map((page, index) => (
          <div key={index} className="card-box">
            <h2>Page {page.pageNumber}</h2>
            <p style={parseFormat(page.format)}>{page.content}</p>
            {page.imageUrl && (
              <img
                src={driveUrlToThumbnail(page.imageUrl)}
                alt={`Page ${page.pageNumber} - 1`}
                style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }}
              />
            )}
            {page.imageUrl2 && (
              <img
                src={driveUrlToThumbnail(page.imageUrl2)}
                alt={`Page ${page.pageNumber} - 2`}
                style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px', marginTop: '8px' }}
              />
            )}
          </div>
        ))}
      </HTMLFlipBook>
    </div>
  );
}
export default FlipBook;
