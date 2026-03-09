import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./TermsGate.css";

/**
 * Wraps content-creation pages. If user hasn't accepted T&C, shows modal.
 * Acceptance stored in localStorage keyed by userId.
 */
function TermsGate({ userId, children }) {
  const storageKey = `terms_accepted_${userId}`;
  const [accepted, setAccepted] = useState(() => localStorage.getItem(storageKey) === "true");
  const [checked, setChecked] = useState(false);

  if (accepted) return <>{children}</>;

  const handleAccept = () => {
    if (!checked) return;
    localStorage.setItem(storageKey, "true");
    setAccepted(true);
  };

  return (
    <div className="terms-gate-overlay">
      <div className="terms-gate-modal" role="dialog" aria-labelledby="terms-gate-title" aria-modal="true">
        <h2 id="terms-gate-title">Terms &amp; Conditions</h2>
        <div className="terms-gate-body">
          <p>Before creating content on SaatSaheli, please read and accept our Terms &amp; Conditions.</p>

          <h3>Content Guidelines</h3>
          <ul>
            <li>All content you create (books, poems, art, gallery, tech, DIY, articles, recipes, etc.) must be original or properly attributed.</li>
            <li>Content must be free from hate speech, harassment, bullying, or any harmful material.</li>
            <li>Content must be appropriate for a general audience.</li>
            <li>Do not post content that infringes on copyright or intellectual property rights.</li>
            <li>No spam, misleading information, or deceptive content.</li>
          </ul>

          <h3>User Responsibilities</h3>
          <ul>
            <li>You are solely responsible for the content you publish on SaatSaheli.</li>
            <li>You must not use the platform for illegal activities or to distribute malicious content.</li>
            <li>Respect other community members and their creative works.</li>
            <li>Report any content that violates these guidelines.</li>
          </ul>

          <h3>Platform Rights</h3>
          <ul>
            <li>SaatSaheli reserves the right to remove any content that violates these terms without prior notice.</li>
            <li>Accounts found repeatedly violating these terms may be suspended or permanently removed.</li>
            <li>By publishing on SaatSaheli, you grant the platform a non-exclusive license to display your content within the site.</li>
          </ul>

          <p>
            For full details, please review our{" "}
            <Link to="/policies" target="_blank" rel="noopener noreferrer">
              Site Policies
            </Link>.
          </p>
        </div>

        <label className="terms-gate-checkbox">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          I have read and agree to the Terms &amp; Conditions
        </label>

        <button
          className="terms-gate-accept"
          onClick={handleAccept}
          disabled={!checked}
        >
          Accept &amp; Continue
        </button>
      </div>
    </div>
  );
}

export default TermsGate;
