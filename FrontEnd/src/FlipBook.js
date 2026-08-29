import React, { useEffect, useState, useRef, useCallback } from "react";
import HTMLFlipBook from "react-pageflip";
import axios from "axios";
import { useStrings } from "./LanguageContext";
import { optimizeCloudinary } from "./utils/imageUrl";
import { resolvePageSize, DEFAULT_PAGE_SIZE_KEY } from "./constants/pageSizes";

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
  return optimizeCloudinary(url);
}

// Parse JSON format string into text style + layout + coverDesign + magazine fields
function parseFormat(formatStr) {
  if (!formatStr) return { style: {}, layout: {}, coverDesign: null, backgroundColor: null, border: null, textBlocks: [], imageBlocks: [] };
  try {
    const parsed = JSON.parse(formatStr);
    const style = {};
    if (parsed.fontFamily) style.fontFamily = parsed.fontFamily;
    if (parsed.fontSize) style.fontSize = parsed.fontSize;
    if (parsed.color) style.color = parsed.color;
    return {
      style,
      layout: parsed.layout || {},
      coverDesign: parsed.coverDesign || null,
      backgroundColor: parsed.backgroundColor || null,
      border: parsed.border || null,
      textBlocks: parsed.textBlocks || [],
      imageBlocks: parsed.imageBlocks || [],
    };
  } catch {
    return { style: {}, layout: {}, coverDesign: null, backgroundColor: null, border: null, textBlocks: [], imageBlocks: [] };
  }
}

// The frame a book is rendered in comes from its page size, so a 6x9 novel, a
// square children's book and an A4 magazine each get a reader shaped like the real
// thing. Books with no page size resolve to CLASSIC, the original 550x700 frame,
// which is why everything published before this feature looks unchanged.
const CLASSIC_FRAME = resolvePageSize(DEFAULT_PAGE_SIZE_KEY);

const ZOOM_LEVELS = [0.75, 1, 1.25, 1.5, 2, 2.5];
const DEFAULT_ZOOM_INDEX = 1;

/**
 * The book's own frame, fetched separately from its pages: /page-size is a single
 * row, where GET /api/books/{id} would re-send every page the reader already has.
 */
function useBookFrame(bookId) {
  // `ready` matters as much as the frame itself: react-pageflip is given size="fixed"
  // and locks its geometry when it mounts, ignoring later width/height changes. If the
  // flipbook mounted before this fetch resolved it would keep the CLASSIC placeholder
  // shape permanently — which is exactly how a square book ended up rendering as a
  // vertical rectangle once published, while the preview happened to win the race.
  const [state, setState] = useState({ frame: CLASSIC_FRAME, ready: false });

  useEffect(() => {
    let cancelled = false;
    setState({ frame: CLASSIC_FRAME, ready: false });
    if (!bookId) {
      setState({ frame: CLASSIC_FRAME, ready: true });
      return undefined;
    }
    axios.get(`${process.env.REACT_APP_API_URL}/api/books/${bookId}/page-size`)
      .then((res) => {
        if (!cancelled) setState({ frame: resolvePageSize(res.data?.pageSize), ready: true });
      })
      // A book whose size can't be read still reads fine in the classic frame.
      .catch(() => {
        if (!cancelled) setState({ frame: CLASSIC_FRAME, ready: true });
      });
    return () => { cancelled = true; };
  }, [bookId]);

  return state;
}

function usePageSize(isFullscreen, frame) {
  const frameW = frame.frameWidth;
  const frameH = frame.frameHeight;
  const ASPECT_RATIO = frameH / frameW;
  const DESKTOP_W = frameW;
  const DESKTOP_H = frameH;
  const [size, setSize] = useState({ w: DESKTOP_W, h: DESKTOP_H, isMobile: false });

  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobile = vw < 768;

      if (isFullscreen) {
        // Fullscreen: use full viewport, reserve only minimal toolbar space
        const toolbarH = 50;
        const availH = vh - toolbarH;
        const availW = vw - (isMobile ? 16 : 40);

        if (isMobile) {
          // Mobile fullscreen: single page, fit to screen
          let h = availH;
          let w = Math.round(h / ASPECT_RATIO);
          if (w > availW) {
            w = availW;
            h = Math.round(w * ASPECT_RATIO);
          }
          setSize({ w, h, isMobile: true });
        } else {
          // Desktop fullscreen: two-page spread, each page fits half the width
          const halfW = Math.floor((availW - 8) / 2); // 8px gap between pages
          let h = availH;
          let w = Math.round(h / ASPECT_RATIO);
          if (w > halfW) {
            w = halfW;
            h = Math.round(w * ASPECT_RATIO);
          }
          setSize({ w, h, isMobile: false });
        }
        return;
      }

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
        // Desktop renders a two-page spread, so a page gets half the width (less the
        // 8px gutter) — not all of it. Wide frames (square and landscape books) would
        // otherwise lay out a spread far wider than the window.
        const halfW = Math.floor((availW - 8) / 2);
        // Calculate size that fits within available space while maintaining aspect ratio
        let h = Math.min(availH, DESKTOP_H);
        let w = Math.round(h / ASPECT_RATIO);
        // If too wide, constrain by width instead
        if (w > halfW) {
          w = halfW;
          h = Math.round(w * ASPECT_RATIO);
        }
        // Ensure minimum size — but never past the half-width, or the spread overflows
        // again on a narrow desktop window.
        const minW = Math.min(400, halfW);
        w = Math.max(w, minW);
        h = Math.max(h, Math.round(minW * ASPECT_RATIO));
        setSize({ w, h, isMobile: false });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullscreen, frameW, frameH]);

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
  const flipBookRef = useRef(null);
  const pinchRef = useRef({ startDist: 0, startZoom: 1 });
  const fullscreenRef = useRef(null);
  const zoomWrapperRef = useRef(null);
  const pinchingRef = useRef(false);
  const pinchEndTimer = useRef(null);
  // Entering fullscreen wraps the whole tree in a new parent, so React tears down
  // and rebuilds the scroll container. Holding the node in state (not just a ref)
  // makes the touch listeners re-attach to the new node instead of clinging to the
  // discarded one — otherwise pinch-to-zoom silently dies in fullscreen.
  const [scrollEl, setScrollEl] = useState(null);
  const scrollContainerRef = useRef(null);
  // useCallback keeps this ref callback's identity stable, so React doesn't detach
  // and re-run it (null, then the node) on every single render.
  const setScrollRef = useCallback((el) => {
    scrollContainerRef.current = el;
    fullscreenRef.current = el;
    setScrollEl((prev) => (prev === el ? prev : el));
  }, []);
  // Mirror state the touch listeners read, so they never see a stale value.
  const pinchZoomRef = useRef(1);
  pinchZoomRef.current = pinchZoom;
  const currentPageRef = useRef(0);
  currentPageRef.current = currentPage;
  const audioCtxRef = useRef(null);
  const { frame, ready: frameReady } = useBookFrame(bookId);
  const pageSize = usePageSize(isFullscreen, frame);
  const DESKTOP_W = frame.frameWidth;
  const DESKTOP_H = frame.frameHeight;

  const zoomLevel = ZOOM_LEVELS[zoomIndex] * pinchZoom;

  // CSS scale() paints the page larger but leaves its layout box unchanged, so a
  // scrolling ancestor never gains room to pan into. Measure the wrapper's real
  // (unscaled) box and give the scroll container a sizer of the scaled dimensions,
  // so panning works in both axes and no part of the page is unreachable.
  const measuredRef = useRef({ w: 0, h: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  const scaledW = natural.w * zoomLevel;
  const scaledH = natural.h * zoomLevel;
  // Pan mode requires BOTH an actual zoom-in and real overflow. Testing overflow
  // alone was too fragile: at rest the page sits within ~16px of the viewport, and
  // mobile browser chrome hiding/showing changes innerHeight, so the mode flickered
  // and flipping became unreliable. At normal zoom the reader always flips.
  const needsPan = zoomLevel > 1.05 && natural.w > 0 && viewport.w > 0 &&
    (scaledW > viewport.w + 1 || scaledH > viewport.h + 1);
  const canFlip = !needsPan;

  // Scale factor for positioning elements relative to desktop size
  const scale = pageSize.w / DESKTOP_W;

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/books/${bookId}/pages`)
      .then(res => setPages(res.data))
      .catch(err => console.error(err));
  }, [bookId]);

  // Native fullscreen API
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      setPinchZoom(1);
      // Hide body scrollbar for immersive experience
      document.body.style.overflow = "hidden";
      // Use native fullscreen API
      const el = fullscreenRef.current || document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } else {
      setIsFullscreen(false);
      setPinchZoom(1);
      document.body.style.overflow = "";
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") { setIsFullscreen(false); setPinchZoom(1); document.body.style.overflow = ""; }
    };
    const handleFsChange = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        setIsFullscreen(false);
        setPinchZoom(1);
        document.body.style.overflow = "";
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

  // Pinch-to-zoom for touch devices.
  //
  // Listeners are attached in the CAPTURE phase on the scroll container, which is
  // an ancestor of the flipbook. That ordering is the whole point: a pinch usually
  // lands fingers on the page itself, and react-pageflip reads those touches as a
  // swipe and turns the page mid-zoom. Capturing first lets us stopPropagation()
  // so the flip library never sees the gesture at all.
  //
  // Suppression persists until every finger is up plus a short cooldown, because
  // lifting one finger of a pinch leaves the other one down — and that lone
  // finger, still moving, is exactly what a swipe looks like.
  useEffect(() => {
    const el = scrollEl;
    if (!el) return;
    const getTouchDist = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };
    const beginPinch = (touches) => {
      pinchRef.current.startDist = getTouchDist(touches);
      pinchRef.current.startZoom = pinchZoomRef.current;
      if (!pinchingRef.current) {
        // The first finger may already have started a drag before the second one
        // landed, leaving a half-turned page floating under the pinch. Suppressing
        // further events cannot undo a drag that is already running, so tell the
        // library to settle back on the current page explicitly.
        try { flipBookRef.current?.pageFlip()?.turnToPage(currentPageRef.current); } catch { /* not ready yet */ }
      }
      pinchingRef.current = true;
    };
    const onTouchStart = (e) => {
      if (e.touches.length >= 2) {
        if (pinchEndTimer.current) {
          window.clearTimeout(pinchEndTimer.current);
          pinchEndTimer.current = null;
        }
        beginPinch(e.touches);
        e.stopPropagation();
      }
    };
    const onTouchMove = (e) => {
      if (e.touches.length >= 2) {
        if (!pinchingRef.current || !pinchRef.current.startDist) beginPinch(e.touches);
        e.stopPropagation();
        e.preventDefault();
        const dist = getTouchDist(e.touches);
        const ratio = dist / pinchRef.current.startDist;
        setPinchZoom(Math.max(0.5, Math.min(3, pinchRef.current.startZoom * ratio)));
      } else if (pinchingRef.current) {
        // One finger left over from the pinch — don't let it become a page flip.
        e.stopPropagation();
      }
    };
    const onTouchEnd = (e) => {
      if (!pinchingRef.current) return;
      // Deliberately NOT stopping propagation. If the flip library saw the first
      // finger's touchstart before the pinch began, swallowing touchend leaves it
      // mid-drag and the page floats under the finger forever. Its touchmoves were
      // suppressed, so it settles with no movement and snaps back instead.
      if (e.touches.length === 0) {
        if (pinchEndTimer.current) window.clearTimeout(pinchEndTimer.current);
        pinchEndTimer.current = window.setTimeout(() => {
          pinchingRef.current = false;
          pinchRef.current.startDist = 0;
          pinchEndTimer.current = null;
        }, 250);
      }
    };
    const opts = { capture: true, passive: false };
    el.addEventListener("touchstart", onTouchStart, opts);
    el.addEventListener("touchmove", onTouchMove, opts);
    el.addEventListener("touchend", onTouchEnd, opts);
    el.addEventListener("touchcancel", onTouchEnd, opts);
    return () => {
      el.removeEventListener("touchstart", onTouchStart, opts);
      el.removeEventListener("touchmove", onTouchMove, opts);
      el.removeEventListener("touchend", onTouchEnd, opts);
      el.removeEventListener("touchcancel", onTouchEnd, opts);
      if (pinchEndTimer.current) window.clearTimeout(pinchEndTimer.current);
    };
  }, [scrollEl]);


  // Soft page-flip "swoosh" — brown noise with a sweeping bandpass filter
  // (mimics air moving past paper). Web Audio API only, no asset file.
  // Lazily initializes AudioContext on first flip; browser audio is gated
  // behind user gesture, and a page flip qualifies.
  const playFlipSound = useCallback(() => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      const duration = 0.13;
      const sampleRate = ctx.sampleRate;
      const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
      const data = buffer.getChannelData(0);
      // Brown noise (integrated white noise — smoother, lower-frequency-heavy)
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      // Bandpass that sweeps from high → low: gives the "swoosh through air" feel
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.value = 0.9;
      filter.frequency.setValueAtTime(3500, now);
      filter.frequency.exponentialRampToValueAtTime(900, now + duration);
      // Amplitude envelope — quick attack, smooth decay
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.10, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start(now);
    } catch {
      // Web Audio not supported / blocked — silent fallback
    }
  }, []);

  const onFlip = useCallback((e) => {
    setCurrentPage(e.data);
    playFlipSound();
    // Reset scroll position when page changes
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTop = 0;
      container.scrollLeft = 0;
    }
  }, [playFlipSound]);

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

  const totalPages = pages.length;

  // Measure the unscaled wrapper and the visible viewport. offsetWidth/Height are
  // unaffected by transform, so these stay stable as the zoom changes and cannot
  // feed back into themselves.
  useEffect(() => {
    const measure = () => {
      const wrap = zoomWrapperRef.current;
      const cont = scrollContainerRef.current;
      if (wrap) {
        const w = wrap.offsetWidth;
        const h = wrap.offsetHeight;
        const prev = measuredRef.current;
        if (w > 0 && (Math.abs(prev.w - w) > 1 || Math.abs(prev.h - h) > 1)) {
          measuredRef.current = { w, h };
          setNatural({ w, h });
        }
      }
      // Height comes from the CSS cap on the scroll container, not its current
      // content height — the container grows with the sizer once panning starts.
      const vh = typeof window !== "undefined" ? window.innerHeight : 800;
      setViewport({
        w: cont ? cont.clientWidth : (typeof window !== "undefined" ? window.innerWidth : 1200),
        h: vh - (isFullscreen ? 50 : 100),
      });
    };
    measure();
    // The flipbook lays out asynchronously; re-measure once it has settled.
    const raf = window.requestAnimationFrame(measure);
    const timer = window.setTimeout(measure, 350);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [totalPages, pageSize.w, pageSize.h, isFullscreen]);

  // Render a single page element (shared between flipbook and scroll reader)
  const renderPageContent = (page, index) => {
    const { style: textStyle, layout, coverDesign, backgroundColor, border, textBlocks, imageBlocks } = parseFormat(page.format);
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

    // Inner wrapper carries background/border since page-flip overwrites outer div's inline styles
    const innerStyle = {
      position: "relative",
      overflow: "hidden",
      width: "100%",
      height: "100%",
      boxSizing: "border-box",
    };
    if (backgroundColor) innerStyle.background = backgroundColor;
    if (border) {
      innerStyle.border = `${border.width || "2px"} ${border.style || "solid"} ${border.color || "#333"}`;
    }

    if (isCoverOrBack && img1Src) {
      return (
        <div key={index} className="card-box flipbook-page">
          <div style={{ ...innerStyle, padding: 0 }}>
            <img
              src={img1Src}
              alt={isFirstPage ? "Cover" : isLastPage ? "Back Cover" : strings.flipBook.pageImageAlt(pageNum, 1)}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>
      );
    }

    // Check if this page uses magazine-style textBlocks/imageBlocks
    const hasMagazineBlocks = textBlocks.length > 0 || imageBlocks.length > 0;

    return (
      <div key={index} className="card-box flipbook-page">
        <div style={innerStyle}>
        <span style={{ ...pageNumStyle, top: 6 }}>{pageNum}</span>
        <span style={{ ...pageNumStyle, bottom: 6 }}>{pageNum}</span>
        {hasMagazineBlocks ? (
          <>
            {/* Render images first so text appears on top */}
            {imageBlocks.map((ib) => (
              <img key={ib.id} src={resolveImageUrl(ib.url)} alt=""
                style={{
                  position: "absolute",
                  left: (ib.x || 0) * scale,
                  top: (ib.y || 0) * scale,
                  width: (ib.width || 200) * scale,
                  height: (ib.height || 150) * scale,
                  objectFit: ib.objectFit || "cover",
                  borderRadius: 4,
                  opacity: (ib.opacity != null ? ib.opacity : 100) / 100,
                  zIndex: 1,
                }}
              />
            ))}
            {/* Text blocks rendered after images = on top */}
            {textBlocks.map((tb) => (
              <div key={tb.id} style={{
                position: "absolute",
                left: (tb.x || 0) * scale,
                top: (tb.y || 0) * scale,
                width: (tb.width || 200) * scale,
                height: tb.height ? tb.height * scale : "auto",
                fontFamily: tb.fontFamily || "sans-serif",
                fontSize: tb.fontSize ? `${parseFloat(tb.fontSize) * scale}px` : `${14 * scale}px`,
                color: tb.color || "#000",
                fontWeight: tb.fontWeight || "normal",
                fontStyle: tb.fontStyle || "normal",
                textDecoration: tb.textDecoration || "none",
                textAlign: tb.textAlign || "left",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                overflow: "hidden",
                pointerEvents: "none",
                zIndex: 2,
              }}
                dangerouslySetInnerHTML={{ __html: tb.content }}
              />
            ))}
          </>
        ) : hasLayout ? (
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
            }}
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
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
          <div style={textOnlyStyle}
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        )}
        </div>
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
            {fullscreenBtn}
          </div>
        )}

        {/* Always flipbook — scrollable container when zoomed, pointer-events control for flip vs scroll */}
        <div className="flipbook-stage">
        {/* While zoomed the whole page area is given over to panning, so swiping can
            no longer turn pages. These edge strips restore flipping: tap the far
            left or right band to move a page. Hidden at normal zoom, where a plain
            swipe already works and a permanent strip would only get in the way. */}
        {needsPan && (
          <>
            <button
              type="button"
              className="flipbook-edge-flip flipbook-edge-left"
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              aria-label={strings.flipBook.prevPage}
            >
              <span aria-hidden="true">&#8249;</span>
            </button>
            <button
              type="button"
              className="flipbook-edge-flip flipbook-edge-right"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages - 1}
              aria-label={strings.flipBook.nextPage}
            >
              <span aria-hidden="true">&#8250;</span>
            </button>
          </>
        )}
        <div
          className={`flipbook-zoom-scroll${needsPan ? " flipbook-pan-active" : ""}`}
          ref={setScrollRef}
          style={{ touchAction: needsPan ? "pan-x pan-y" : "auto" }}
        >
          <div
            className="flipbook-zoom-sizer"
            style={needsPan ? { width: Math.ceil(scaledW), height: Math.ceil(scaledH) } : undefined}
          >
          <div
            className="flipbook-zoom-wrapper"
            ref={zoomWrapperRef}
            style={{
              transform: `scale(${zoomLevel})`,
              // Anchor top-left while panning: with a centred origin the overflow
              // above and to the left of the page cannot be scrolled to at all.
              transformOrigin: needsPan ? "top left" : undefined,
              // Only pan mode detaches the flip library. Pinches are handled by the
              // capture-phase listeners; toggling pointer-events mid-gesture as well
              // just added churn without adding protection.
              pointerEvents: canFlip ? "auto" : "none",
            }}
          >
            {/* Mount only once the book's real frame is known — see useBookFrame. The key
                is a second guard: it is the frame identity (not pageSize, which changes on
                every window resize), so a frame arriving late forces one clean remount
                rather than leaving stale locked-in geometry. */}
            {frameReady ? (
              <HTMLFlipBook
                key={frame.key}
                width={pageSize.w}
                height={pageSize.h}
                maxWidth={pageSize.w}
                maxHeight={pageSize.h}
                showCover={true}
                usePortrait={pageSize.isMobile}
                autoSize={false}
                size="fixed"
                showPageCorners={true}
                swipeDistance={30}
                mobileScrollSupport={false}
                ref={flipBookRef}
                onFlip={onFlip}
              >
                {pages.map((page, index) => renderPageContent(page, index))}
              </HTMLFlipBook>
            ) : (
              <div style={{ width: pageSize.w, height: pageSize.h }} aria-hidden="true" />
            )}
          </div>
          </div>
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
