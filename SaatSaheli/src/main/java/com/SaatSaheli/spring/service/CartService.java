package com.SaatSaheli.spring.service;

import com.SaatSaheli.spring.model.CartItem;
import com.SaatSaheli.spring.model.MarketplaceListing;
import com.SaatSaheli.spring.repository.CartItemRepository;
import com.SaatSaheli.spring.repository.MarketplaceListingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class CartService {

    /** Thrown for validation failures the caller should surface as a 400. */
    public static class CartException extends RuntimeException {
        public CartException(String message) { super(message); }
    }

    @Autowired
    private CartItemRepository cartRepo;

    @Autowired
    private MarketplaceListingRepository listingRepo;

    /**
     * Returns the user's cart, each item enriched with its current listing. Listings
     * that have since been deleted are pruned; sold/removed ones are kept but flagged
     * via the listing status so the UI can show "no longer available".
     */
    public List<CartItem> getCart(Long userId) {
        List<CartItem> items = cartRepo.findByUserIdOrderByAddedDateAsc(userId);
        List<CartItem> result = new ArrayList<>();
        for (CartItem item : items) {
            Optional<MarketplaceListing> opt = listingRepo.findById(item.getListingId());
            if (opt.isEmpty()) {
                // The listing was hard-deleted — drop the dangling cart row.
                cartRepo.deleteById(item.getId());
                continue;
            }
            item.setListing(opt.get());
            result.add(item);
        }
        return result;
    }

    public CartItem addToCart(Long userId, Long listingId) {
        MarketplaceListing listing = listingRepo.findById(listingId)
                .orElseThrow(() -> new CartException("Listing not found"));

        if (!"ACTIVE".equalsIgnoreCase(listing.getStatus())) {
            throw new CartException("This item is no longer available");
        }
        if (listing.getQuantity() <= 0) {
            throw new CartException("This item is sold out");
        }
        if (listing.getPriceAmount() == null || listing.getCurrency() == null) {
            throw new CartException("This item isn't available for online purchase");
        }
        if (userId.equals(listing.getUserId())) {
            throw new CartException("You can't buy your own listing");
        }

        // A Stripe Checkout Session is single-currency, so a cart must be one currency.
        String cartCurrency = getCartCurrency(userId);
        if (cartCurrency != null && !cartCurrency.equalsIgnoreCase(listing.getCurrency())) {
            throw new CartException("Your cart is in " + cartCurrency.toUpperCase()
                    + ". Check out or clear it before adding a " + listing.getCurrency().toUpperCase() + " item.");
        }

        Optional<CartItem> existing = cartRepo.findByUserIdAndListingId(userId, listingId);
        if (existing.isPresent()) {
            existing.get().setListing(listing);
            return existing.get();
        }

        CartItem item = new CartItem();
        item.setUserId(userId);
        item.setListingId(listingId);
        item.setAddedDate(LocalDateTime.now());
        CartItem saved = cartRepo.save(item);
        saved.setListing(listing);
        return saved;
    }

    public void removeFromCart(Long userId, Long listingId) {
        cartRepo.deleteByUserIdAndListingId(userId, listingId);
    }

    public void clearCart(Long userId) {
        cartRepo.deleteByUserId(userId);
    }

    /** The currency of the items already in the cart, or null if empty. */
    public String getCartCurrency(Long userId) {
        for (CartItem item : cartRepo.findByUserIdOrderByAddedDateAsc(userId)) {
            MarketplaceListing l = listingRepo.findById(item.getListingId()).orElse(null);
            if (l != null && l.getCurrency() != null) {
                return l.getCurrency();
            }
        }
        return null;
    }
}
