import React, { useEffect, useState } from "react";
import usePwaInstall from "../hooks/usePwaInstall";
import "./OpenInAppButton.css";

/**
 * "Open in App" button for the Home page (top, centered).
 *
 * Web-platform reality this button lives inside:
 *  - There is NO web API that lets a browser tab launch or switch into an
 *    already-installed PWA. So when the app is already installed we can only
 *    tell the user to tap the home-screen icon — we cannot open it for them.
 *  - When NOT installed we CAN help: replay the captured install event on
 *    Android/desktop Chrome (real native dialog), or show the Share → Add to
 *    Home Screen steps on iOS Safari (Apple gives no programmatic install).
 *
 * Hidden entirely when already running as the installed app (standalone).
 */
function OpenInAppButton() {
  const { canInstall, isIOS, isStandalone, installedThisSession, promptInstall } = usePwaInstall();
  const [hint, setHint] = useState(null); // "ios" | "installed" | "manual" | null
  const [relatedInstalled, setRelatedInstalled] = useState(false);

  // Android-only: detect whether our PWA is already installed. Requires the
  // manifest's `related_applications` (webapp) entry. No-op elsewhere.
  useEffect(() => {
    let cancelled = false;
    if (navigator.getInstalledRelatedApps) {
      navigator
        .getInstalledRelatedApps()
        .then((apps) => {
          if (!cancelled && Array.isArray(apps) && apps.length > 0) {
            setRelatedInstalled(true);
          }
        })
        .catch(() => {
          /* unsupported / blocked — ignore */
        });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Inside the installed app already, or just installed this session — nothing
  // to offer (we can't launch the standalone window from a browser tab anyway).
  if (isStandalone || installedThisSession) return null;

  const handleClick = async () => {
    setHint(null);

    // 1. Best case: a real, replayable install event (Android / desktop Chrome).
    if (canInstall) {
      await promptInstall();
      return;
    }

    // 2. Already installed but opened in a browser tab — we can't launch it.
    if (relatedInstalled) {
      setHint("installed");
      return;
    }

    // 3. iOS Safari — no programmatic install; show the manual steps.
    if (isIOS) {
      setHint("ios");
      return;
    }

    // 4. Fallback (event not yet fired, unsupported browser, desktop): point
    //    the user at the browser's own install control.
    setHint("manual");
  };

  return (
    <div className="open-in-app">
      <button
        type="button"
        className="open-in-app-btn"
        onClick={handleClick}
        aria-haspopup="dialog"
        aria-expanded={hint ? true : false}
      >
        <svg className="open-in-app-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="5" y="2" width="14" height="20" rx="2.5" ry="2.5" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
        Open in App
      </button>

      {hint && (
        <div className="open-in-app-hint" role="dialog" aria-label="Install SaatSaheli app">
          <button
            type="button"
            className="open-in-app-hint-close"
            onClick={() => setHint(null)}
            aria-label="Dismiss"
          >
            &times;
          </button>

          {hint === "installed" && (
            <p>
              You already have the SaatSaheli app installed. Tap the
              {" "}<strong>SaatSaheli icon</strong> on your home screen to open it.
            </p>
          )}

          {hint === "ios" && (
            <p>
              To install on iPhone: tap the
              {" "}
              <svg className="open-in-app-share" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 16V4" />
                <path d="M8 8l4-4 4 4" />
                <path d="M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6" />
              </svg>
              {" "}
              <strong>Share</strong> icon, then choose <strong>Add to Home Screen</strong>.
            </p>
          )}

          {hint === "manual" && (
            <p>
              To install: open your browser menu
              {" "}(<strong>⋮</strong>) and choose{" "}
              <strong>Install app</strong> / <strong>Add to Home screen</strong>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default OpenInAppButton;
