import React from "react";
import { Link } from "react-router-dom";
import "./MarketplaceFooter.css";

const SHIP_COUNTRIES = "India · USA · UK · Canada · Australia · UAE · Singapore";

export default function MarketplaceFooter() {
  return (
    <footer className="shop-footer">
      <div className="shop-footer-inner">
        <div className="shop-footer-col">
          <h4>SaatSaheli Shop</h4>
          <p>Handpicked goods sold by SaatSaheli. Secure checkout, buyer protection, and easy cancellations.</p>
        </div>
        <div className="shop-footer-col">
          <h4>Policies</h4>
          <Link to="/marketplace/terms">Terms &amp; Conditions</Link>
          <Link to="/marketplace/buying">Buying Policy</Link>
          <Link to="/marketplace/selling">Selling Policy</Link>
          <Link to="/marketplace/shipping">Shipping &amp; Returns</Link>
        </div>
        <div className="shop-footer-col">
          <h4>Shop</h4>
          <Link to="/marketplace">Home</Link>
          <Link to="/marketplace/browse">Browse</Link>
          <Link to="/marketplace/orders">My Orders</Link>
          <Link to="/marketplace/favorites">Favorites</Link>
        </div>
        <div className="shop-footer-col">
          <h4>Ships to 🌐</h4>
          <p>{SHIP_COUNTRIES}</p>
          <Link to="/" className="shop-footer-back">← Back to SaatSaheli</Link>
        </div>
      </div>
      <div className="shop-footer-bottom">
        © {"2026"} SaatSaheli. All transactions handled securely via Stripe.
      </div>
    </footer>
  );
}
