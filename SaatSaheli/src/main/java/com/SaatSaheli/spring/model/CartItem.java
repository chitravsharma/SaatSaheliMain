package com.SaatSaheli.spring.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * One marketplace listing a buyer has placed in their cart. Marketplace items are
 * unique physical goods, so quantity is always 1 — a cart is a set of listings.
 * Unique (user_id, listing_id) keeps a listing from being added twice.
 */
@Entity
@Table(name = "marketplace_cart_items",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "listing_id"}))
public class CartItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "listing_id", nullable = false)
    private Long listingId;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "added_date")
    private LocalDateTime addedDate;

    // Populated for API responses from the current listing; not persisted here.
    @Transient
    private MarketplaceListing listing;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getListingId() { return listingId; }
    public void setListingId(Long listingId) { this.listingId = listingId; }

    public LocalDateTime getAddedDate() { return addedDate; }
    public void setAddedDate(LocalDateTime addedDate) { this.addedDate = addedDate; }

    public MarketplaceListing getListing() { return listing; }
    public void setListing(MarketplaceListing listing) { this.listing = listing; }
}
