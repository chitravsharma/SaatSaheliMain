import React, { useEffect, useState, useRef, useCallback } from "react";
import HTMLFlipBook from "react-pageflip";
import axios from "axios";
import { useStrings } from "./LanguageContext";

// Resolve image URL (supports local uploads and Drive URLs)
function resolveImageUrl(url) {
  if (!url) return null;
  // Local upload path
  if (url.startsWith("/uploads/")) {
    return `${process.env.REACT_APP_API_URL}${url}`;
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

const DESKTOP_W = 550;
const DESKTOP_H = 700;
const ASPECT_RATIO = DESKTOP_H / DESKTOP_W;

const ZOOM_LEVELS = [0.75, 1, 1.25, 1.5];
const DEFAULT_ZOOM_INDEX = 1;

function usePageSize() {
  const [size, setSize] = useState({ w: DESKTOP_W, h: DESKTOP_H, isMobile: false });

  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      if (vw < 500) {
        const w = Math.min(vw - 32, 360);
        setSize({ w, h: Math.round(w * ASPECT_RATIO), isMobile: true });
      } else if (vw < 768) {
        const w = Math.min(vw - 48, 480);
        setSize({ w, h: Math.round(w * ASPECT_RATIO), isMobile: true });
      } else {
        setSize({ w: DESKTOP_W, h: DESKTOP_H, isMobile: false });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return size;
}

const defaultImgLayout = (key) => ({
  x: key === "image1" ? 10 : 210,
  y: 60,
  width: 160,
  height: 120,
});

function FlipBook({ bookId }) {
  const strings = useStrings();
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const flipBookRef = useRef(null);
  const pageSize = usePageSize();

  const zoomLevel = ZOOM_LEVELS[zoomIndex];

  // Scale factor for positioning elements relative to desktop size
  const scale = pageSize.w / DESKTOP_W;

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/books/${bookId}/pages`)
      .then(res => setPages(res.data))
      .catch(err => console.error(err));
  }, [bookId]);

  const handlePrev = useCallback(() => {
    flipBookRef.current?.pageFlip()?.flipPrev();
  }, []);

  const handleNext = useCallback(() => {
    flipBookRef.current?.pageFlip()?.flipNext();
  }, []);

  const handleFirst = useCallback(() => {
    flipBookRef.current?.pageFlip()?.turnToPage(0);
  }, []);

  const handleLast = useCallback(() => {
    const total = pages.length;
    if (total > 0) {
      flipBookRef.current?.pageFlip()?.turnToPage(total - 1);
    }
  }, [pages.length]);

  const onFlip = useCallback((e) => {
    setCurrentPage(e.data);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoomIndex((prev) => Math.min(prev + 1, ZOOM_LEVELS.length - 1));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomIndex(DEFAULT_ZOOM_INDEX);
  }, []);

  const totalPages = pages.length;

  return (
    <div className="center-container">
      <div className="flipbook-nav-wrapper">
        <div className="flipbook-toolbar">
          <div className="flipbook-arrow-row">
            <button
              className="flipbook-arrow"
              onClick={handleFirst}
              disabled={currentPage === 0}
              aria-label={strings.flipBook.firstPage}
            >
              &#x23EE;
            </button>
            <button
              className="flipbook-arrow"
              onClick={handlePrev}
              disabled={currentPage === 0}
              aria-label={strings.flipBook.prevPage}
            >
              &#8249;
            </button>
            <span className="flipbook-page-indicator">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              className="flipbook-arrow"
              onClick={handleNext}
              disabled={currentPage >= totalPages - 1}
              aria-label={strings.flipBook.nextPage}
            >
              &#8250;
            </button>
            <button
              className="flipbook-arrow"
              onClick={handleLast}
              disabled={currentPage >= totalPages - 1}
              aria-label={strings.flipBook.lastPage}
            >
              &#x23ED;
            </button>
          </div>
          <div className="flipbook-zoom-controls">
            <button
              className="flipbook-zoom-btn"
              onClick={handleZoomOut}
              disabled={zoomIndex === 0}
              aria-label={strings.flipBook.zoomOut}
            >
              &minus;
            </button>
            <span
              className="flipbook-zoom-label"
              onDoubleClick={handleZoomReset}
              title={strings.flipBook.zoomReset}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") handleZoomReset(); }}
              aria-label={`${Math.round(zoomLevel * 100)}% - ${strings.flipBook.zoomReset}`}
            >
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              className="flipbook-zoom-btn"
              onClick={handleZoomIn}
              disabled={zoomIndex === ZOOM_LEVELS.length - 1}
              aria-label={strings.flipBook.zoomIn}
            >
              +
            </button>
          </div>
        </div>
        <div
          className="flipbook-zoom-wrapper"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: "top center",
          }}
        >
          <HTMLFlipBook
            width={pageSize.w}
            height={pageSize.h}
            showCover={true}
            usePortrait={pageSize.isMobile}
            autoSize={true}
            showPageCorners={true}
            swipeDistance={30}
            mobileScrollSupport={false}
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
            const textLayout = layout.text || { x: 10, y: 10, width: DESKTOP_W - 20, height: 40 };

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
                      left: textLayout.x * scale,
                      top: textLayout.y * scale,
                      width: textLayout.width * scale,
                      ...textStyle,
                      fontSize: textStyle.fontSize ? `${parseFloat(textStyle.fontSize) * scale}px` : undefined,
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
                          left: img1Layout.x * scale,
                          top: img1Layout.y * scale,
                          width: img1Layout.width * scale,
                          height: img1Layout.height * scale,
                          objectFit: img1Layout.width >= DESKTOP_W - 20 && img1Layout.height >= DESKTOP_H ? "contain" : "cover",
                          borderRadius: img1Layout.width >= DESKTOP_W - 20 && img1Layout.height >= DESKTOP_H ? 0 : 4,
                        }}
                      />
                    )}
                    {img2Src && (
                      <img
                        src={img2Src}
                        alt={strings.flipBook.pageImageAlt(page.pageNumber, 2)}
                        style={{
                          position: "absolute",
                          left: img2Layout.x * scale,
                          top: img2Layout.y * scale,
                          width: img2Layout.width * scale,
                          height: img2Layout.height * scale,
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
    </div>
  );
}
export default FlipBook;
