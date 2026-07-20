import React, { useState, useEffect } from "react";
import "./InstallPrompt.css";

/**
 * Smart PWA install prompt. Two modes, one component:
 *
 *  1. Android / desktop Chrome/Edge — the browser fires `beforeinstallprompt`.
 *     We capture it, suppress the default mini-infobar, and show our own
 *     "Install app" button that replays the saved event on click.
 *
 *  2. iOS Safari — Apple never fires `beforeinstallprompt` and gives no
 *     programmatic install. The only path is Share → "Add to Home Screen",
 *     so here we render an *instructional* banner (not a button).
 *
 * Hidden entirely when the app is already installed (running standalone), and
 * dismissible with a cooldown so we never nag on every visit.
 */

const DISMISS_KEY = "ss_install_dismissed_at";
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

// Already running as an installed app? (Chrome/Android + iOS Safari flavours)
function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isIOS() {
  const ua = window.navigator.userAgent || "";
  const iOSDevice = /iphone|ipad|ipod/i.test(ua);
  // iPadOS 13+ masquerades as desktop Safari — detect via touch points.
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return at > 0 && Date.now() - at < COOLDOWN_MS;
  } catch {
    return false;
  }
}

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null); // Android/desktop event
  const [showIOS, setShowIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    // Mode 1: capture the Chromium install event.
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // If the user installs (via our button or the browser UI), clear everything.
    const onInstalled = () => {
      setDeferredPrompt(null);
      setShowIOS(false);
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("appinstalled", onInstalled);

    // Mode 2: iOS Safari gets the instructional banner instead. Small delay so
    // it doesn't fight the initial paint / land before the page is readable.
    let iosTimer;
    if (isIOS()) {
      iosTimer = setTimeout(() => setShowIOS(true), 2500);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice; // resolves whether accepted or dismissed
    } catch {
      /* ignore */
    }
    // A saved beforeinstallprompt event can only be used once.
    setDeferredPrompt(null);
  };

  if (dismissed) return null;

  // ---- Mode 1: Android / desktop install button ----
  if (deferredPrompt) {
    return (
      <div className="install-prompt install-prompt-android" role="dialog" aria-label="Install SaatSaheli app">
        <img src="/icons/icon-96.png" alt="" className="install-prompt-icon" width="40" height="40" />
        <div className="install-prompt-text">
          <strong>Install SaatSaheli</strong>
          <span>Add it to your device for a full-screen, app-like experience.</span>
        </div>
        <button className="install-prompt-cta" onClick={handleInstall}>
          Install app
        </button>
        <button className="install-prompt-dismiss" onClick={dismiss} title="Not now" aria-label="Dismiss">
          &times;
        </button>
      </div>
    );
  }

  // ---- Mode 2: iOS Safari instructions ----
  if (showIOS) {
    return (
      <div className="install-prompt install-prompt-ios" role="dialog" aria-label="Install SaatSaheli app">
        <img src="/icons/icon-96.png" alt="" className="install-prompt-icon" width="40" height="40" />
        <div className="install-prompt-text">
          <strong>Install SaatSaheli</strong>
          <span>
            Tap the Share icon
            {" "}
            <svg className="install-prompt-share" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 16V4" />
              <path d="M8 8l4-4 4 4" />
              <path d="M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6" />
            </svg>
            {" "}
            then choose <strong>Add to Home Screen</strong>.
          </span>
        </div>
        <button className="install-prompt-dismiss" onClick={dismiss} title="Not now" aria-label="Dismiss">
          &times;
        </button>
      </div>
    );
  }

  return null;
}

export default InstallPrompt;
