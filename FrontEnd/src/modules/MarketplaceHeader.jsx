import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useCart } from "../contexts/CartContext";
import { useRegion } from "../contexts/RegionContext";
import NotificationBell from "./NotificationBell";
import "./MarketplaceHeader.css";

const navClass = ({ isActive }) => "shop-nav-link" + (isActive ? " active" : "");

export default function MarketplaceHeader() {
  const { user } = useAuth();
  const { cartCount } = useCart();
  const { isIndia, region, setRegion } = useRegion();
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <header className="shop-header">
      <div className="shop-header-inner">
        <Link to="/marketplace" className="shop-brand" onClick={close}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
          </svg>
          <span>Sarayu <strong>Shop</strong></span>
        </Link>

        {!menuOpen && <span className="shop-menu-hint" aria-hidden="true">Menu</span>}
        <button className="shop-hamburger" aria-label="Menu" onClick={() => setMenuOpen(o => !o)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>

        <nav className={"shop-nav" + (menuOpen ? " open" : "")}>
          <NavLink to="/marketplace" end className={navClass} onClick={close}>Home</NavLink>
          <NavLink to="/marketplace/browse" className={navClass} onClick={close}>Shop</NavLink>
          {user && <NavLink to="/marketplace/orders" className={navClass} onClick={close}>Orders</NavLink>}
          {user && <NavLink to="/marketplace/favorites" className={navClass} onClick={close}>Favorites</NavLink>}

          {!isIndia && (
            <NavLink to="/marketplace/cart" className={({ isActive }) => "shop-nav-link shop-cart-link" + (isActive ? " active" : "")} onClick={close}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
              Cart{cartCount > 0 && <span className="shop-cart-badge">{cartCount}</span>}
            </NavLink>
          )}

          {user && <NotificationBell />}

          {user ? (
            <Link to="/marketplace/account" className="shop-nav-link" onClick={close}>Account</Link>
          ) : (
            <Link to="/Login" className="shop-nav-link shop-login" onClick={close}>Login</Link>
          )}

          <label className="shop-region-select" title="India orders are contact-to-buy (online payment not available in India yet)">
            <span className="shop-region-select-label">🌐 Shipping to</span>
            <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Shipping region">
              <option value="INTL">USA</option>
              <option value="IN">India</option>
            </select>
          </label>

          <Link to="/" className="shop-back-link" onClick={close}>← SaatSaheli</Link>
        </nav>
      </div>
    </header>
  );
}
