import React from "react";
import { Link } from "react-router-dom";
import "./SitePolicies.css";

const SHIP_COUNTRIES = ["India", "United States", "United Kingdom", "Canada", "Australia", "UAE", "Singapore"];

function PolicyShell({ title, children }) {
  return (
    <div className="policies-page">
      <div className="policies-hero">
        <h1>{title}</h1>
        <hr className="policies-divider" />
      </div>
      {children}
      <div className="policies-section" style={{ marginTop: 24 }}>
        <p>
          <Link to="/marketplace">← Back to SaatSaheli Shop</Link>{"  ·  "}
          <Link to="/marketplace/terms">Terms</Link>{"  ·  "}
          <Link to="/marketplace/buying">Buying</Link>{"  ·  "}
          <Link to="/marketplace/selling">Selling</Link>{"  ·  "}
          <Link to="/marketplace/shipping">Shipping &amp; Returns</Link>
        </p>
      </div>
      <p className="policies-updated">Last updated: 2026</p>
    </div>
  );
}

export function MarketplaceTerms() {
  return (
    <PolicyShell title="Marketplace Terms & Conditions">
      <div className="policies-section">
        <h2>1. Who sells on SaatSaheli Shop</h2>
        <p>SaatSaheli Shop is a single-seller storefront: <strong>Avika Ventures is the seller</strong> of every item
          listed. Any registered, logged-in user may purchase. By placing an order you agree to these terms.</p>
      </div>
      <div className="policies-section">
        <h2>2. Orders & payment</h2>
        <p>All payments are processed securely by Stripe; we never store your card details. Prices are shown in the
          listing's currency and charged at checkout. An order is confirmed once payment succeeds and you receive a
          confirmation number by email.</p>
      </div>
      <div className="policies-section">
        <h2>3. Cancellations & refunds</h2>
        <p>You may cancel a paid order for a full refund while it has <strong>not yet shipped</strong> and within
          <strong> 24 hours</strong> of purchase, directly from <Link to="/marketplace/orders">My Orders</Link>.
          Refunds are issued to your original payment method. After shipping, see our
          <Link to="/marketplace/shipping"> Shipping &amp; Returns</Link> policy.</p>
      </div>
      <div className="policies-section">
        <h2>4. Acceptable use</h2>
        <p>You agree not to misuse the store, attempt fraudulent payments, or resell items in violation of applicable
          law. We may cancel orders we reasonably believe to be fraudulent.</p>
      </div>
    </PolicyShell>
  );
}

export function MarketplaceBuying() {
  return (
    <PolicyShell title="Buying Policy">
      <div className="policies-section">
        <h2>Placing an order</h2>
        <p>Add items to your cart, review your order, and pay securely via Stripe. You must be logged in to buy so we
          can send your confirmation and let you track and manage the order.</p>
      </div>
      <div className="policies-section">
        <h2>Buyer protection</h2>
        <p>If your item arrives damaged, not as described, or never arrives, contact us within 7 days of delivery (or
          the expected delivery date) and we'll make it right — repair, replacement, or refund.</p>
      </div>
      <div className="policies-section">
        <h2>Cancelling</h2>
        <p>Cancel for a full auto-refund while the order is unshipped and within 24 hours, from
          <Link to="/marketplace/orders"> My Orders</Link>.</p>
      </div>
    </PolicyShell>
  );
}

export function MarketplaceSelling() {
  return (
    <PolicyShell title="Selling Policy">
      <div className="policies-section">
        <h2>Single-seller store</h2>
        <p>Avika Ventures is the only seller on this store. Individual users cannot list items for sale here; listings are
          curated and fulfilled by Avika Ventures.</p>
      </div>
      <div className="policies-section">
        <h2>Listing standards</h2>
        <p>Every item we list includes accurate photos, a clear description, condition, and price. We stand behind the
          authenticity and condition of what we sell.</p>
      </div>
      <div className="policies-section">
        <h2>Interested in selling with us?</h2>
        <p>If you'd like SaatSaheli to feature or sell your handmade goods, please reach out via the main site's
          <Link to="/contacts"> Contact</Link> page.</p>
      </div>
    </PolicyShell>
  );
}

export function MarketplaceShipping() {
  return (
    <PolicyShell title="Shipping & Returns">
      <div className="policies-section">
        <h2>Where we ship</h2>
        <p>We currently ship to: {SHIP_COUNTRIES.join(", ")}. Your shipping country is collected at secure checkout;
          orders can only be completed for these countries.</p>
      </div>
      <div className="policies-section">
        <h2>Processing & delivery</h2>
        <p>Orders are typically processed within 2–4 business days. Delivery times vary by destination. You'll receive
          a tracking number on <Link to="/marketplace/orders">My Orders</Link> once your order ships.</p>
      </div>
      <div className="policies-section">
        <h2>Returns</h2>
        <p>Before shipping: cancel any order within 24 hours for a full automatic refund. After delivery: if an item is
          defective or not as described, contact us within 7 days for a replacement or refund. Made-to-order and
          personalised items may be non-returnable unless faulty.</p>
      </div>
    </PolicyShell>
  );
}
