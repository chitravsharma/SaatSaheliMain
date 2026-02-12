import React, { useEffect, useState, useRef, useCallback } from "react";
import HTMLFlipBook from "react-pageflip";
import axios from "axios";
import strings from "./constants/strings";

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
  const [currentPage, setCurrentPage] = useState(0);
  const flipBookRef = useRef(null);

  useEffect(() => {
    axios.get(`http://localhost:8081/api/books/${bookId}/pages`)
      .then(res => setPages(res.data))
      .catch(err => console.error(err));
  }, [bookId]);

  const handlePrev = useCallback(() => {
    flipBookRef.current?.pageFlip()?.flipPrev();
  }, []);

  const handleNext = useCallback(() => {
    flipBookRef.current?.pageFlip()?.flipNext();
  }, []);

  const onFlip = useCallback((e) => {
    setCurrentPage(e.data);
  }, []);

  const totalPages = pages.length;

  return (
    <div className="center-container">
      <div className="flipbook-nav-wrapper">
        <div className="flipbook-arrow-row">
          <button
            className="flipbook-arrow"
            onClick={handlePrev}
            disabled={currentPage === 0}
            aria-label={strings.flipBook.prevPage}
          >
            &#8249;
          </button>
          <button
            className="flipbook-arrow"
            onClick={handleNext}
            disabled={currentPage >= totalPages - 1}
            aria-label={strings.flipBook.nextPage}
          >
            &#8250;
          </button>
        </div>
        <HTMLFlipBook
          width={PAGE_W}
          height={PAGE_H}
          showCover={true}
          ref={flipBookRef}
          onFlip={onFlip}
        >
        {pages.map((page, index) => {
          const { style: textStyle, layout } = parseFormat(page.format);
          const img1Src = resolveImageUrl(page.imageUrl);
          const img2Src = resolveImageUrl(page.imageUrl2);
          const hasLayout = img1Src || img2Src;
          const img1Layout = layout.image1 || defaultImgLayout("image1");
          const img2Layout = layout.image2 || defaultImgLayout("image2");
          const textLayout = layout.text || { x: 10, y: 10, width: PAGE_W - 20, height: 40 };

          const pageNum = page.pageNumber;
          const pageNumStyle = {
            position: "absolute",
            right: 10,
            fontSize: "0.7rem",
            color: "#6b7280",
            pointerEvents: "none",
          };

          return (
            <div key={index} className="card-box" style={{ position: "relative", overflow: "hidden" }}>
              <span style={{ ...pageNumStyle, top: 6 }}>{pageNum}</span>
              <span style={{ ...pageNumStyle, bottom: 6 }}>{pageNum}</span>
              {hasLayout ? (
                <>
                  <div style={{
                    position: "absolute",
                    left: textLayout.x,
                    top: textLayout.y,
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
                      alt={strings.flipBook.pageImageAlt(page.pageNumber, 1)}
                      style={{
                        position: "absolute",
                        left: img1Layout.x,
                        top: img1Layout.y,
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
                      alt={strings.flipBook.pageImageAlt(page.pageNumber, 2)}
                      style={{
                        position: "absolute",
                        left: img2Layout.x,
                        top: img2Layout.y,
                        width: img2Layout.width,
                        height: img2Layout.height,
                        objectFit: "cover",
                        borderRadius: 4,
                      }}
                    />
                  )}
                </>
              ) : (
                <p style={{ ...textStyle, padding: "8px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {page.content}
                </p>
              )}
            </div>
          );
        })}
        </HTMLFlipBook>
      </div>
    </div>
  );
}
export default FlipBook;
