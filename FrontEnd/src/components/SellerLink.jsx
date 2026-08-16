import React from "react";
import { SHOP_SELLER_NAME, SHOP_SELLER_URL } from "../constants/strings";

/**
 * Seller attribution for shop listings. The storefront sells on behalf of one
 * parent business, so this is a fixed name linking out to its site rather than
 * the per-listing sellerName (which stays visible in the admin table).
 */
export default function SellerLink() {
  return (
    <a
      className="mp-seller-link"
      href={SHOP_SELLER_URL}
      target="_blank"
      rel="noopener noreferrer"
    >
      {SHOP_SELLER_NAME}
    </a>
  );
}
