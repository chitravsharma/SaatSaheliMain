package com.SaatSaheli.spring.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "marketplace_listings")
public class MarketplaceListing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String price; // free-form display price ("$25", "Free", "Best Offer")

    // Numeric price for cart/checkout. Null = not purchasable ("Contact seller").
    @Column(name = "price_amount", precision = 12, scale = 2)
    private BigDecimal priceAmount;

    // ISO currency for priceAmount: "usd" or "inr".
    private String currency;

    private String category;

    @Column(name = "item_condition")
    private String condition;

    @Column(name = "contact_info")
    private String contactInfo;

    @Column(name = "image1_url")
    private String image1Url;

    @Column(name = "image2_url")
    private String image2Url;

    @Column(name = "image3_url")
    private String image3Url;

    @Column(name = "image4_url")
    private String image4Url;

    private String status; // ACTIVE (available), INACTIVE (hidden by admin), REMOVED

    // How many units are in stock. Decremented on purchase, restored on
    // cancel/refund. 0 = sold out (listing stays visible, just not buyable).
    // Admin sets this; existing rows default to 1 via columnDefinition.
    @Column(columnDefinition = "integer default 1")
    private Integer quantity = 1;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "created_date")
    private LocalDateTime createdDate;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "modified_date")
    private LocalDateTime modifiedDate;

    @Transient
    private String sellerName;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getPrice() { return price; }
    public void setPrice(String price) { this.price = price; }

    public BigDecimal getPriceAmount() { return priceAmount; }
    public void setPriceAmount(BigDecimal priceAmount) { this.priceAmount = priceAmount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getCondition() { return condition; }
    public void setCondition(String condition) { this.condition = condition; }

    public String getContactInfo() { return contactInfo; }
    public void setContactInfo(String contactInfo) { this.contactInfo = contactInfo; }

    public String getImage1Url() { return image1Url; }
    public void setImage1Url(String image1Url) { this.image1Url = image1Url; }

    public String getImage2Url() { return image2Url; }
    public void setImage2Url(String image2Url) { this.image2Url = image2Url; }

    public String getImage3Url() { return image3Url; }
    public void setImage3Url(String image3Url) { this.image3Url = image3Url; }

    public String getImage4Url() { return image4Url; }
    public void setImage4Url(String image4Url) { this.image4Url = image4Url; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getQuantity() { return quantity == null ? 0 : quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }

    public LocalDateTime getModifiedDate() { return modifiedDate; }
    public void setModifiedDate(LocalDateTime modifiedDate) { this.modifiedDate = modifiedDate; }

    public String getSellerName() { return sellerName; }
    public void setSellerName(String sellerName) { this.sellerName = sellerName; }

    @Override
    public String toString() {
        return "MarketplaceListing [id=" + id + ", title=" + title + ", price=" + price + ", status=" + status + "]";
    }
}
