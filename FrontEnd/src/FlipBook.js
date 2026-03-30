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

// Parse JSON format string into text style + layout + coverDesign
function parseFormat(formatStr) {
  if (!formatStr) return { style: {}, layout: {}, coverDesign: null };
  try {
    const parsed = JSON.parse(formatStr);
    const style = {};
    if (parsed.fontFamily) style.fontFamily = parsed.fontFamily;
    if (parsed.fontSize) style.fontSize = parsed.fontSize;
    if (parsed.color) style.color = parsed.color;
    return { style, layout: parsed.layout || {}, coverDesign: parsed.coverDesign || null };
  } catch {
    return { style: {}, layout: {}, coverDesign: null };
  }
}

const DESKTOP_W = 550;
const DESKTOP_H = 700;
const ASPECT_RATIO = DESKTOP_H / DESKTOP_W;

const ZOOM_LEVELS = [0.75, 1, 1.25, 1.5, 2, 2.5];
const DEFAULT_ZOOM_INDEX = 1;

function usePageSize() {
  const [size, setSize] = useState({ w: DESKTOP_W, h: DESKTOP_H, isMobile: false });

  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (vw < 500) {
        const w = Math.min(vw - 32, 360);
        setSize({ w, h: Math.round(w * ASPECT_RATIO), isMobile: true });
      } else if (vw < 768) {
        const w = Math.min(vw - 48, 480);
        setSize({ w, h: Math.round(w * ASPECT_RATIO), isMobile: true });
      } else {
        // Fit page to available viewport: reserve ~120px for toolbar/nav
        const availH = vh - 120;
        const availW = vw - 80;
        // Calculate size that fits within available space while maintaining aspect ratio
        let h = Math.min(availH, DESKTOP_H);
        let w = Math.round(h / ASPECT_RATIO);
        // If too wide, constrain by width instead
        if (w > availW) {
          w = availW;
          h = Math.round(w * ASPECT_RATIO);
        }
        // Ensure minimum size
        w = Math.max(w, 400);
        h = Math.max(h, Math.round(400 * ASPECT_RATIO));
        setSize({ w, h, isMobile: false });
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pinchZoom, setPinchZoom] = useState(1);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [ttsPaused, setTtsPaused] = useState(false);
  const [ttsReadAll, setTtsReadAll] = useState(false); // podcast mode - read all pages
  const flipBookRef = useRef(null);
  const pinchRef = useRef({ startDist: 0, startZoom: 1 });
  const fullscreenRef = useRef(null);
  const ttsPageRef = useRef(0); // track which page TTS is reading for podcast mode
  const pageSize = usePageSize();

  const zoomLevel = ZOOM_LEVELS[zoomIndex] * pinchZoom;

  // Calculate if the zoomed page exceeds the available viewport
  const availHeight = (typeof window !== "undefined" ? window.innerHeight : 800) - 120;
  const availWidth = (typeof window !== "undefined" ? window.innerWidth : 1200) - 40;
  const scaledPageH = pageSize.h * zoomLevel;
  const scaledPageW = pageSize.w * zoomLevel;
  // Determine if zoomed and whether enough of the page is visible to allow flipping
  const isZoomed = zoomLevel > 1.05;
  const visibleFraction = Math.min(1, availWidth / scaledPageW) * Math.min(1, availHeight / scaledPageH);
  const canFlip = !isZoomed || visibleFraction >= 0.75;

  // Scale factor for positioning elements relative to desktop size
  const scale = pageSize.w / DESKTOP_W;

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/books/${bookId}/pages`)
      .then(res => setPages(res.data))
      .catch(err => console.error(err));
  }, [bookId]);

  // Native fullscreen API for mobile
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      setPinchZoom(1);
      // Use native fullscreen on mobile
      const el = fullscreenRef.current || document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } else {
      setIsFullscreen(false);
      setPinchZoom(1);
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") { setIsFullscreen(false); setPinchZoom(1); }
    };
    const handleFsChange = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        setIsFullscreen(false);
        setPinchZoom(1);
      }
    };
    window.addEventListener("keydown", handleEsc);
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, [isFullscreen]);

  // Pinch-to-zoom for touch devices
  useEffect(() => {
    const el = fullscreenRef.current;
    if (!el) return;
    const getTouchDist = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };
    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        pinchRef.current.startDist = getTouchDist(e.touches);
        pinchRef.current.startZoom = pinchZoom;
      }
    };
    const onTouchMove = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDist(e.touches);
        const ratio = dist / pinchRef.current.startDist;
        const newZoom = Math.max(0.5, Math.min(3, pinchRef.current.startZoom * ratio));
        setPinchZoom(newZoom);
      }
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  });


  const onFlip = useCallback((e) => {
    setCurrentPage(e.data);
    // Reset scroll position when page changes
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTop = 0;
      container.scrollLeft = 0;
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoomIndex((prev) => Math.min(prev + 1, ZOOM_LEVELS.length - 1));
    setPinchZoom(1);
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomIndex((prev) => Math.max(prev - 1, 0));
    setPinchZoom(1);
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomIndex(DEFAULT_ZOOM_INDEX);
    setPinchZoom(1);
  }, []);

  // Text-to-Speech functions
  const getPageText = useCallback((pageIndex) => {
    if (pageIndex < 0 || pageIndex >= pages.length) return "";
    const page = pages[pageIndex];
    return page.content || "";
  }, [pages]);

  const stopTts = useCallback(() => {
    window.speechSynthesis?.cancel();
    setTtsPlaying(false);
    setTtsPaused(false);
    setTtsReadAll(false);
  }, []);

  const speakPage = useCallback((pageIndex, readAll) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const text = getPageText(pageIndex);
    if (!text.trim()) {
      // Skip empty pages in podcast mode
      if (readAll && pageIndex < pages.length - 1) {
        const next = pageIndex + 1;
        ttsPageRef.current = next;
        flipBookRef.current?.pageFlip()?.turnToPage(next);
        setTimeout(() => speakPage(next, true), 500);
        return;
      }
      setTtsPlaying(false);
      setTtsReadAll(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onend = () => {
      if (readAll && pageIndex < pages.length - 1) {
        const next = pageIndex + 1;
        ttsPageRef.current = next;
        flipBookRef.current?.pageFlip()?.turnToPage(next);
        setTimeout(() => speakPage(next, true), 500);
      } else {
        setTtsPlaying(false);
        setTtsReadAll(false);
      }
    };
    utterance.onerror = () => {
      setTtsPlaying(false);
      setTtsReadAll(false);
    };
    setTtsPlaying(true);
    setTtsPaused(false);
    window.speechSynthesis.speak(utterance);
  }, [getPageText, pages.length]);

  const handleTtsReadPage = useCallback(() => {
    if (ttsPlaying && !ttsPaused) {
      // Pause
      window.speechSynthesis?.pause();
      setTtsPaused(true);
    } else if (ttsPlaying && ttsPaused) {
      // Resume
      window.speechSynthesis?.resume();
      setTtsPaused(false);
    } else {
      // Start reading current page
      speakPage(currentPage, false);
    }
  }, [ttsPlaying, ttsPaused, currentPage, speakPage]);

  const handleTtsPodcast = useCallback(() => {
    if (ttsReadAll) {
      stopTts();
      return;
    }
    setTtsReadAll(true);
    ttsPageRef.current = currentPage;
    speakPage(currentPage, true);
  }, [ttsReadAll, currentPage, speakPage, stopTts]);

  // Stop TTS when component unmounts
  useEffect(() => {
    return () => window.speechSynthesis?.cancel();
  }, []);

  const totalPages = pages.length;
  const scrollContainerRef = useRef(null);

  // Render a single page element (shared between flipbook and scroll reader)
  const renderPageContent = (page, index) => {
    const { style: textStyle, layout, coverDesign } = parseFormat(page.format);
    const img1Src = resolveImageUrl(page.imageUrl);
    const img2Src = resolveImageUrl(page.imageUrl2);
    const hasLayout = img1Src || img2Src;
    const img1Layout = layout.image1 || defaultImgLayout("image1");
    const img2Layout = layout.image2 || defaultImgLayout("image2");
    const textLayout = layout.text || { x: 10, y: 10, width: DESKTOP_W - 20, height: 40 };

    const pageNum = page.pageNumber;
    const isFirstPage = index === 0;
    const isLastPage = index === pages.length - 1;
    const isCoverOrBack = isFirstPage || isLastPage || coverDesign != null;

    const pageNumStyle = {
      position: "absolute",
      right: 10,
      fontSize: "0.7rem",
      color: isCoverOrBack ? "rgba(255,255,255,0.5)" : "#6b7280",
      pointerEvents: "none",
      zIndex: 2,
    };

    const PAGE_MARGIN = 40 * scale;
    const textOnlyStyle = {
      ...textStyle,
      padding: `${PAGE_MARGIN}px`,
      paddingTop: `${PAGE_MARGIN + 12}px`,
      paddingBottom: `${PAGE_MARGIN + 12}px`,
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      fontSize: textStyle.fontSize || `${Math.max(14, 16 * scale)}px`,
      lineHeight: 1.75,
      color: textStyle.color || "#1a1a2e",
      fontFamily: textStyle.fontFamily || "'Georgia', 'Times New Roman', serif",
      margin: 0,
      height: "100%",
      boxSizing: "border-box",
      overflow: "auto",
      textAlign: "left",
    };

    if (isCoverOrBack && img1Src) {
      return (
        <div key={index} className="card-box flipbook-page" style={{ position: "relative", overflow: "hidden", padding: 0, width: pageSize.w, height: pageSize.h }}>
          <img
            src={img1Src}
            alt={isFirstPage ? "Cover" : isLastPage ? "Back Cover" : strings.flipBook.pageImageAlt(pageNum, 1)}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      );
    }

    return (
      <div key={index} className="card-box flipbook-page" style={{ position: "relative", overflow: "hidden", width: pageSize.w, height: pageSize.h }}>
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
          <div style={textOnlyStyle}>
            {page.content}
          </div>
        )}
      </div>
    );
  };

  const handlePrevPage = useCallback(() => {
    flipBookRef.current?.pageFlip()?.flipPrev();
  }, []);

  const handleNextPage = useCallback(() => {
    flipBookRef.current?.pageFlip()?.flipNext();
  }, []);

  const handleFirstPage = useCallback(() => {
    flipBookRef.current?.pageFlip()?.turnToPage(0);
  }, []);

  const handleLastPage = useCallback(() => {
    if (totalPages > 0) {
      flipBookRef.current?.pageFlip()?.turnToPage(totalPages - 1);
    }
  }, [totalPages]);

  // Navigation arrows (shared between normal and fullscreen)
  const navArrows = (
    <div className="flipbook-arrow-row">
      <button className="flipbook-arrow" onClick={handleFirstPage} disabled={currentPage === 0} aria-label={strings.flipBook.firstPage}>&#x23EE;</button>
      <button className="flipbook-arrow" onClick={handlePrevPage} disabled={currentPage === 0} aria-label={strings.flipBook.prevPage}>&#8249;</button>
      <span className="flipbook-page-indicator">{currentPage + 1} / {totalPages}</span>
      <button className="flipbook-arrow" onClick={handleNextPage} disabled={currentPage >= totalPages - 1} aria-label={strings.flipBook.nextPage}>&#8250;</button>
      <button className="flipbook-arrow" onClick={handleLastPage} disabled={currentPage >= totalPages - 1} aria-label={strings.flipBook.lastPage}>&#x23ED;</button>
    </div>
  );

  const zoomControls = (
    <div className="flipbook-zoom-controls">
      <button className="flipbook-zoom-btn" onClick={handleZoomOut} disabled={zoomIndex === 0} aria-label={strings.flipBook.zoomOut}>&minus;</button>
      <span className="flipbook-zoom-label" onDoubleClick={handleZoomReset} title={strings.flipBook.zoomReset} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") handleZoomReset(); }} aria-label={`${Math.round(zoomLevel * 100)}% - ${strings.flipBook.zoomReset}`}>{Math.round(zoomLevel * 100)}%</span>
      <button className="flipbook-zoom-btn" onClick={handleZoomIn} disabled={zoomIndex === ZOOM_LEVELS.length - 1} aria-label={strings.flipBook.zoomIn}>+</button>
    </div>
  );

  const ttsControls = (
    <div className="flipbook-tts-controls">
      <button className={`flipbook-tts-btn ${ttsPlaying && !ttsPaused ? "flipbook-tts-active" : ""}`} onClick={handleTtsReadPage} title={ttsPlaying ? (ttsPaused ? "Resume reading" : "Pause reading") : "Read this page aloud"}>
        {ttsPlaying && !ttsPaused ? "\u23F8" : "\u25B6"} {ttsPlaying ? (ttsPaused ? "Resume" : "Pause") : "Read"}
      </button>
      <button className={`flipbook-tts-btn ${ttsReadAll ? "flipbook-tts-podcast" : ""}`} onClick={handleTtsPodcast} title={ttsReadAll ? "Stop podcast" : "Read aloud as podcast (all pages)"}>
        {ttsReadAll ? "\u23F9 Stop" : "\u{1F399} Podcast"}
      </button>
      {ttsPlaying && (
        <button className="flipbook-tts-btn" onClick={stopTts} title="Stop reading">&#x23F9;</button>
      )}
    </div>
  );

  const fullscreenBtn = (
    <button className="flipbook-fullscreen-btn" onClick={toggleFullscreen} aria-label={isFullscreen ? strings.flipBook.exitFullscreen : strings.flipBook.fullscreen} title={isFullscreen ? strings.flipBook.exitFullscreen : strings.flipBook.fullscreen}>
      {isFullscreen ? "\u2715" : "\u26F6"}
    </button>
  );

  const content = (
    <div className="center-container">
      <div className="flipbook-nav-wrapper">
        {/* In fullscreen: minimal toolbar (just nav + exit). Normal: full toolbar */}
        {isFullscreen ? (
          <div className="flipbook-toolbar flipbook-toolbar-minimal">
            {navArrows}
            {zoomControls}
            {fullscreenBtn}
          </div>
        ) : (
          <div className="flipbook-toolbar">
            {navArrows}
            {zoomControls}
            {ttsControls}
            {fullscreenBtn}
          </div>
        )}

        {/* Always flipbook — scrollable container when zoomed, pointer-events control for flip vs scroll */}
        <div
          className="flipbook-zoom-scroll"
          ref={(el) => { scrollContainerRef.current = el; fullscreenRef.current = el; }}
          style={{ touchAction: isZoomed && !canFlip ? "pan-x pan-y" : "auto" }}
        >
          <div
            className="flipbook-zoom-wrapper"
            style={{
              transform: `scale(${zoomLevel})`,
              pointerEvents: canFlip ? "auto" : "none",
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
              {pages.map((page, index) => renderPageContent(page, index))}
            </HTMLFlipBook>
          </div>
        </div>

        <div className="flipbook-copyright">
          &copy; {new Date().getFullYear()} @chitravsharma &mdash; SaatSaheli. All rights reserved.
        </div>
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="flipbook-fullscreen-overlay">
        {content}
      </div>
    );
  }

  return content;
}
export default FlipBook;
