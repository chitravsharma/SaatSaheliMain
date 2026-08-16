import React, { useEffect, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import GoogleSignInFallback from "./GoogleSignInFallback";

/**
 * Google sign-in button that notices when it failed to appear.
 *
 * Google Identity Services declines to render inside some embedded webviews — the
 * LinkedIn app is a confirmed case — and it fails silently: <GoogleLogin> asks GIS to
 * renderButton() into a div, GIS never does, and its onError never fires. The user is
 * left staring at an empty gap with no way in.
 *
 * Which environments break is not something we can reliably predict from the user
 * agent: the same LinkedIn link opens in real Safari on a laptop (button works), and
 * other apps' webviews have been observed rendering the button fine. So rather than
 * guessing from a blocklist, this watches the container and swaps in a fallback only
 * when a button genuinely did not show up. A late render flips it back, so a slow
 * network cannot strand a working button behind the fallback.
 */
const PROBE_TIMEOUT_MS = 5000;

export default function GoogleSignInButton({ divider = null, ...googleLoginProps }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState("probing"); // probing | ok | unavailable

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    // GIS injects a styled button (or an iframe) into the div <GoogleLogin> owns.
    // Until then our container collapses to zero height.
    const hasButton = () =>
      el.getBoundingClientRect().height > 0 ||
      !!el.querySelector('div[role="button"], iframe');

    const check = () => { if (hasButton()) setStatus("ok"); };

    if (hasButton()) {
      setStatus("ok");
      return undefined;
    }

    const observer = new MutationObserver(() => {
      if (hasButton()) setStatus("ok");
    });
    observer.observe(el, { childList: true, subtree: true, attributes: true });

    const giveUp = setTimeout(() => {
      if (!hasButton()) setStatus("unavailable");
    }, PROBE_TIMEOUT_MS);

    const poll = setInterval(check, 400);

    return () => {
      observer.disconnect();
      clearTimeout(giveUp);
      clearInterval(poll);
    };
  }, []);

  return (
    <>
      {/* Stays mounted even once we've given up: if GIS wakes up late the observer
          flips us back to "ok" rather than leaving a working button hidden. */}
      <div
        ref={containerRef}
        className="gsi-button-slot"
        style={status === "unavailable" ? { display: "none" } : { display: "flex", justifyContent: "center" }}
      >
        <GoogleLogin {...googleLoginProps} />
      </div>
      {status === "unavailable" && <GoogleSignInFallback />}
      {status === "ok" && divider}
    </>
  );
}
