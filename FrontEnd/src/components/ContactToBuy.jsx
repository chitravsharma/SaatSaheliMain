import React from "react";
import { Link } from "react-router-dom";
import "./ContactToBuy.css";

/**
 * Shown instead of price/cart/buy when the visitor can't check out online
 * (India — payments not set up yet). Points them to Help & Support to order.
 */
export default function ContactToBuy({ compact = false }) {
  return (
    <div className={"contact-to-buy" + (compact ? " contact-to-buy--compact" : "")}>
      <Link to="/help-support" className="contact-to-buy-btn">
        Contact us to buy your copy →
      </Link>
      {!compact && (
        <p className="contact-to-buy-note">
          Online payment isn’t available in your region yet — we’ll help you order your copy.
        </p>
      )}
    </div>
  );
}
