import React, { useEffect, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import axios from "axios";

// Resolve image URL (supports local uploads and Drive URLs)
function resolveImageUrl(url) {
  if (!url) return null;
  // Local upload path
  if (url.startsWith("/uploads/")) {
    return `http://localhost:8081${url}`;
  }
  // Google Drive shareable link
  const match = url.match(/\/file\/d\/([^/]+)\//);
  if (match) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
  }
  return url;
}

// Parse JSON format string into text style + layout
function parseFormat(formatStr) {
  if (!formatStr) return { style: {}, layout: {} };
  try {
    const parsed = JSON.parse(formatStr);
    const style = {};
    if (parsed.fontFamily) style.fontFamily = parsed.fontFamily;
    if (parsed.fontSize) style.fontSize = parsed.fontSize;
    if (parsed.color) style.color = parsed.color;
    return { style, layout: parsed.layout || {} };
  } catch {
    return { style: {}, layout: {} };
  }
}

const PAGE_W = 400;
const PAGE_H = 500;

const defaultImgLayout = (key) => ({
  x: key === "image1" ? 10 : 210,
  y: 60,
  width: 160,
  height: 120,
});

function FlipBook({ bookId }) {
  const [pages, setPages] = useState([]);

  useEffect(() => {
    axios.get(`http://localhost:8081/api/books/${bookId}/pages`)
      .then(res => setPages(res.data))
      .catch(err => console.error(err));
  }, [bookId]);

  return (
    <div className="center-container">
      <HTMLFlipBook width={PAGE_W} height={PAGE_H}>
        {pages.map((page, index) => {
          const { style: textStyle, layout } = parseFormat(page.format);
          const img1Src = resolveImageUrl(page.imageUrl);
          const img2Src = resolveImageUrl(page.imageUrl2);
          const hasLayout = img1Src || img2Src;
          const img1Layout = layout.image1 || defaultImgLayout("image1");
          const img2Layout = layout.image2 || defaultImgLayout("image2");
          const textLayout = layout.text || { x: 10, y: 10, width: PAGE_W - 20, height: 40 };

          return (
            <div key={index} className="card-box" style={{ position: "relative", overflow: "hidden" }}>
              <h2 style={{ margin: "4px 8px", fontSize: "0.9rem" }}>Page {page.pageNumber}</h2>
              {hasLayout ? (
                <>
                  <div style={{
                    position: "absolute",
                    left: textLayout.x,
                    top: textLayout.y + 28,
                    width: textLayout.width,
                    ...textStyle,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    pointerEvents: "none",
                  }}>
                    {page.content}
                  </div>
                  {img1Src && (
                    <img
                      src={img1Src}
                      alt={`Page ${page.pageNumber} - 1`}
                      style={{
                        position: "absolute",
                        left: img1Layout.x,
                        top: img1Layout.y + 28,
                        width: img1Layout.width,
                        height: img1Layout.height,
                        objectFit: "cover",
                        borderRadius: 4,
                      }}
                    />
                  )}
                  {img2Src && (
                    <img
                      src={img2Src}
                      alt={`Page ${page.pageNumber} - 2`}
                      style={{
                        position: "absolute",
                        left: img2Layout.x,
                        top: img2Layout.y + 28,
                        width: img2Layout.width,
                        height: img2Layout.height,
                        objectFit: "cover",
                        borderRadius: 4,
                      }}
                    />
                  )}
                </>
              ) : (
                <p style={{ ...textStyle, padding: "0 8px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {page.content}
                </p>
              )}
            </div>
          );
        })}
      </HTMLFlipBook>
    </div>
  );
}
export default FlipBook;
