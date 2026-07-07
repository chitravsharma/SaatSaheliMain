import React from "react";
import { Outlet } from "react-router-dom";
import MarketplaceHeader from "./MarketplaceHeader";
import MarketplaceFooter from "./MarketplaceFooter";

/**
 * Shopping-site shell for all /marketplace/* routes. Renders its own storefront
 * header/footer (Home, Browse, Cart, Orders, Favorites) instead of the main
 * SaatSaheli site chrome, which App hides for this section.
 */
export default function MarketplaceLayout() {
  return (
    <div className="shop-shell">
      <MarketplaceHeader />
      <div className="shop-content">
        <Outlet />
      </div>
      <MarketplaceFooter />
    </div>
  );
}
