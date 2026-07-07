package com.SaatSaheli.spring.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

/**
 * A single purchased listing, snapshotted onto an order at purchase time so the
 * receipt stays accurate even if the listing is later edited, sold, or deleted.
 */
@Entity
@Table(name = "marketplace_order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "listing_id")
    private Long listingId;

    private String title;

    @Column(name = "price_amount", precision = 12, scale = 2)
    private BigDecimal priceAmount;

    private String currency;

    @Column(name = "seller_id")
    private Long sellerId;

    @Column(name = "image_url")
    private String imageUrl;

    public OrderItem() {}

    public OrderItem(Long listingId, String title, BigDecimal priceAmount, String currency,
                     Long sellerId, String imageUrl) {
        this.listingId = listingId;
        this.title = title;
        this.priceAmount = priceAmount;
        this.currency = currency;
        this.sellerId = sellerId;
        this.imageUrl = imageUrl;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getListingId() { return listingId; }
    public void setListingId(Long listingId) { this.listingId = listingId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public BigDecimal getPriceAmount() { return priceAmount; }
    public void setPriceAmount(BigDecimal priceAmount) { this.priceAmount = priceAmount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public Long getSellerId() { return sellerId; }
    public void setSellerId(Long sellerId) { this.sellerId = sellerId; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
}
