import React, { useEffect, useState } from "react";
import api from "../utils/api";
import "./AdBanner.css";

const API = process.env.REACT_APP_API_URL;

const PLACEMENT_CLASSES = {
  HEADER_TOP: "ad-banner-header",
  FOOTER_TOP: "ad-banner-footer",
  SIDE_RAIL: "ad-banner-side",
};

const AdBanner = ({ placement }) => {
  const [ads, setAds] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (!placement) return;
    let cancelled = false;
    api.get(`${API}/api/advertisements/active/${placement}`)
      .then(res => {
        if (cancelled) return;
        setAds(Array.isArray(res.data) ? res.data : []);
      })
      .catch(err => console.error(`Failed to fetch ads for ${placement}:`, err));
    return () => { cancelled = true; };
  }, [placement]);

  const handleShare = async (ad) => {
    const url = ad.linkUrl || window.location.origin;
    const text = `Check out this on Saat Saheli: ${ad.title}`;
    if (navigator.share) {
      try { await navigator.share({ title: ad.title, text, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopiedId(ad.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  if (!ads.length) return null;

  const variantClass = PLACEMENT_CLASSES[placement] || "ad-banner-header";

  return (
    <div className={`ad-banner-wrap ${variantClass}`}>
      {ads.map(ad => {
        // Admin-controlled width/height override the CSS defaults.
        const adStyle = {};
        if (ad.width) adStyle.width = `${ad.width}px`;
        if (ad.height) adStyle.height = `${ad.height}px`;
        const imgStyle = {};
        if (ad.width) imgStyle.maxWidth = `${ad.width}px`;
        if (ad.height) imgStyle.maxHeight = `${ad.height}px`;
        return (
        <div key={ad.id} className={`ad-banner ad-banner-anim-${ad.animation || "static"}`} style={adStyle}>
          <div className={`ad-banner-content ${ad.animation === "scroll" ? "ad-banner-scroll" : ""} ${ad.animation === "blink" ? "ad-banner-blink" : ""}`}>
            {ad.contentType === "image" && ad.imageUrl && (
              ad.linkUrl ? (
                <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer">
                  <img src={ad.imageUrl} alt={ad.title} className="ad-banner-image" style={imgStyle} />
                </a>
              ) : (
                <img src={ad.imageUrl} alt={ad.title} className="ad-banner-image" style={imgStyle} />
              )
            )}
            {ad.contentType === "html" && (
              <div dangerouslySetInnerHTML={{ __html: ad.htmlContent }} />
            )}
            {ad.contentType === "text" && <h3 className="ad-banner-title">{ad.title}</h3>}
            <div className="ad-banner-actions">
              {ad.linkUrl && ad.contentType !== "image" && (
                <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="ad-banner-cta">Learn More</a>
              )}
              <button className="ad-banner-share-btn" onClick={() => handleShare(ad)} title="Share this ad">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                {copiedId === ad.id ? "Copied!" : "Share"}
              </button>
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
};

export default AdBanner;
