/**
 * In-app (embedded webview) browser detection.
 *
 * Links opened from the LinkedIn / Facebook / Instagram apps load in an embedded
 * webview rather than Safari or Chrome. Google Identity Services refuses to run in
 * embedded webviews (its "disallowed user agent" policy), and even when it starts it
 * has no third-party cookie / FedCM access to accounts.google.com.
 *
 * The failure is silent: @react-oauth/google's <GoogleLogin> asks GIS to
 * renderButton() into a div, GIS never does, and its onError never fires — the user
 * just sees an empty gap where the button should be. Callers use these helpers to
 * hide the dead button and offer email/password plus a way out to a real browser.
 *
 * Switching Google to a redirect flow does NOT help: Google blocks its own sign-in
 * page in embedded webviews with disallowed_useragent.
 */

/** Apps whose in-app browser we can name in the UI, most specific first. */
const KNOWN_IN_APP = [
  { name: "LinkedIn", re: /LinkedInApp/i },
  { name: "Instagram", re: /Instagram/i },
  { name: "Facebook", re: /FBAN|FBAV|FB_IAB/i },
  { name: "Threads", re: /Barcelona/i },
  { name: "X", re: /Twitter/i },
  { name: "Snapchat", re: /Snapchat/i },
  { name: "Pinterest", re: /Pinterest/i },
  { name: "LINE", re: /\bLine\//i },
  { name: "WeChat", re: /MicroMessenger/i },
];

/** Android WebView advertises itself; used when no specific app matched. */
const ANDROID_WEBVIEW = /Android.*;\s*wv\)/i;

const ua = () => (typeof navigator === "undefined" ? "" : navigator.userAgent || "");

/**
 * Our own installed PWA also runs without a browser chrome and, on iOS, without the
 * "Safari/" user-agent token — but Google sign-in works there, so it must never be
 * mistaken for a social app's webview.
 */
function isInstalledPwa() {
  if (typeof window === "undefined") return false;
  if (window.navigator.standalone === true) return true;              // iOS
  return window.matchMedia?.("(display-mode: standalone)")?.matches === true;
}

/**
 * Name of the app hosting this webview ("LinkedIn"), or null when the page is in a
 * normal browser. Unknown embedded webviews return the generic "this app".
 */
export function getInAppBrowserName() {
  const agent = ua();
  if (!agent) return null;

  const match = KNOWN_IN_APP.find((app) => app.re.test(agent));
  if (match) return match.name;

  if (isInstalledPwa()) return null;

  // iOS in-app webviews are the awkward case: WKWebView copies Safari's user agent
  // minus the "Safari/" token, so its absence on an iOS device implies a webview.
  const onIos = /iPhone|iPad|iPod/i.test(agent);
  if (onIos && !/Safari\//i.test(agent) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(agent)) {
    return "this app";
  }

  if (ANDROID_WEBVIEW.test(agent)) return "this app";

  return null;
}

/** True when Google sign-in cannot work here — see the module comment. */
export function isInAppBrowser() {
  return getInAppBrowserName() !== null;
}

export function isAndroid() {
  return /Android/i.test(ua());
}

export function isIos() {
  return /iPhone|iPad|iPod/i.test(ua());
}

/**
 * Android-only escape hatch: an intent:// URL that reopens the current page in
 * Chrome, outside the webview. iOS has no programmatic equivalent — the user has to
 * use the host app's own "Open in Safari" menu item.
 */
export function chromeIntentUrl(path) {
  if (typeof window === "undefined") return null;
  const target = path
    ? new URL(path, window.location.origin).href
    : window.location.href;
  const withoutScheme = target.replace(/^https?:\/\//, "");
  return `intent://${withoutScheme}#Intent;scheme=https;package=com.android.chrome;end`;
}
