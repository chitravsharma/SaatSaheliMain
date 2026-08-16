import React, { useState } from "react";
import { useStrings } from "../LanguageContext";
import { getInAppBrowserName, isAndroid, chromeIntentUrl } from "../utils/inAppBrowser";
import "./GoogleSignInFallback.css";

/**
 * Shown in place of the Google sign-in button when Google Identity Services failed
 * to render one — see GoogleSignInButton, which decides that by observation rather
 * than by guessing from the user agent.
 *
 * The user agent is used only to word the message: if we recognise the host app we
 * name it ("LinkedIn's browser") and offer the right escape hatch, otherwise the copy
 * stays generic. Either way the point is the same — email/password works here.
 */
export default function GoogleSignInFallback() {
  const strings = useStrings();
  const [copied, setCopied] = useState(false);

  const s = strings.login;
  const appName = getInAppBrowserName();
  const onAndroid = isAndroid();

  const title = appName && appName !== "this app"
    ? s.googleUnavailableInApp.replace("{app}", appName)
    : s.googleUnavailableGeneric;

  let body = s.googleUnavailableBody;
  if (appName && onAndroid) body = s.googleUnavailableBodyAndroid;
  else if (appName) body = s.googleUnavailableBodyIos;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="gsi-fallback" role="status">
      <p className="gsi-fallback-title">{title}</p>
      <p className="gsi-fallback-body">{body}</p>
      {appName && (
        <div className="gsi-fallback-actions">
          {onAndroid && (
            <a className="gsi-fallback-btn" href={chromeIntentUrl()}>
              {s.googleUnavailableOpenChrome}
            </a>
          )}
          <button type="button" className="gsi-fallback-btn gsi-fallback-btn-ghost" onClick={copyLink}>
            {copied ? s.googleUnavailableLinkCopied : s.googleUnavailableCopyLink}
          </button>
        </div>
      )}
    </div>
  );
}
