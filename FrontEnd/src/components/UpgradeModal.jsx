import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { subscribeUpgrade } from "../utils/upgradeModalBus";
import "./UpgradeModal.css";

const DEFAULT_MESSAGE =
    "This action requires a higher plan. Upgrade to keep creating.";

/**
 * Global "upgrade your plan" prompt. Mounted once at the app root; it listens to
 * the upgrade-modal bus, which the api.js response interceptor emits on whenever
 * a request fails with HTTP 403 + { upgradeRequired: true }. No props — every
 * plan-limit hit anywhere in the app surfaces here automatically.
 */
function UpgradeModal() {
    const [message, setMessage] = useState(null);

    useEffect(() => subscribeUpgrade((msg) => setMessage(msg || DEFAULT_MESSAGE)), []);

    if (message === null) return null;

    const close = () => setMessage(null);
    const onBackdrop = (e) => {
        if (e.target === e.currentTarget) close();
    };

    return (
        <div className="upgrade-modal-overlay" onClick={onBackdrop}>
            <div
                className="upgrade-modal"
                role="dialog"
                aria-labelledby="upgrade-modal-title"
                aria-modal="true"
            >
                <button
                    type="button"
                    className="upgrade-modal-close"
                    aria-label="Close"
                    onClick={close}
                >
                    ×
                </button>

                <div className="upgrade-modal-badge">Upgrade required</div>
                <h2 id="upgrade-modal-title">Time to grow your plan</h2>
                <p className="upgrade-modal-message">{message}</p>

                <div className="upgrade-modal-actions">
                    <Link to="/pricing" className="upgrade-modal-btn upgrade-modal-btn-primary" onClick={close}>
                        View plans
                    </Link>
                    <button
                        type="button"
                        className="upgrade-modal-btn upgrade-modal-btn-secondary"
                        onClick={close}
                    >
                        Maybe later
                    </button>
                </div>
            </div>
        </div>
    );
}

export default UpgradeModal;
