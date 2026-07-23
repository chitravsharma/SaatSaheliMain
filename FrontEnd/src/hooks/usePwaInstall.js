import { useState, useEffect, useCallback } from "react";

/**
 * Shared PWA install state.
 *
 * A single `beforeinstallprompt` event fires per page load and can only be
 * `prompt()`-ed ONCE. Both the corner InstallPrompt banner and the Home
 * "Open in App" button need it, so we capture it in ONE module-level singleton
 * and fan out to every consumer via a tiny pub/sub — instead of each component
 * stashing its own copy and stealing the one-shot event from the other.
 */

let deferredEvt = null; // saved beforeinstallprompt event (Android/desktop Chrome)
let installedThisSession = false; // fired `appinstalled` since load
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn());
}

// Wire the window listeners exactly once, at module load, so we never miss an
// early `beforeinstallprompt` that fires before any component mounts.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredEvt = e;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferredEvt = null;
    installedThisSession = true;
    emit();
  });
}

// Already running as an installed app? (Chrome/Android + iOS Safari flavours)
export function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export function isIOS() {
  const ua = window.navigator.userAgent || "";
  const iOSDevice = /iphone|ipad|ipod/i.test(ua);
  // iPadOS 13+ masquerades as desktop Safari — detect via touch points.
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}

export default function usePwaInstall() {
  const [, force] = useState(0);

  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  // Show the native install dialog. Returns "accepted" | "dismissed" | "unavailable".
  const promptInstall = useCallback(async () => {
    if (!deferredEvt) return "unavailable";
    deferredEvt.prompt();
    let outcome = "dismissed";
    try {
      const res = await deferredEvt.userChoice; // resolves either way
      outcome = res?.outcome || "dismissed";
    } catch {
      /* ignore */
    }
    deferredEvt = null; // one-shot — a saved event can't be replayed
    emit();
    return outcome;
  }, []);

  return {
    canInstall: !!deferredEvt, // Android/desktop Chrome, not yet installed
    installedThisSession,
    isIOS: isIOS(),
    isStandalone: isStandalone(),
    promptInstall,
  };
}
