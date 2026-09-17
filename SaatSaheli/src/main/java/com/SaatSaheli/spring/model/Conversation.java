package com.SaatSaheli.spring.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * A private buyer ↔ seller thread about one item (a gallery image marked For
 * Sale). One row per (seller, buyer, item). Admins/super-admins may read every
 * thread for safety; only the two participants can write.
 */
@Entity
@Table(name = "conversations",
        uniqueConstraints = @UniqueConstraint(name = "uk_conversation_party_item",
                columnNames = {"seller_id", "buyer_id", "target_type", "target_id"}),
        indexes = {
            @Index(name = "idx_conversations_seller", columnList = "seller_id"),
            @Index(name = "idx_conversations_buyer", columnList = "buyer_id")
        })
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "seller_id", nullable = false)
    private Long sellerId;

    /** Null for a guest enquiry (visitor without an account) — see guest* fields. */
    @Column(name = "buyer_id")
    private Long buyerId;

    // ── Guest enquiry (buyer not logged in): contact details the seller replies to ──
    @Column(name = "guest_name")
    private String guestName;

    @Column(name = "guest_email")
    private String guestEmail;

    @Column(name = "guest_phone")
    private String guestPhone;

    /** GALLERY_IMAGE for now; polymorphic so books/recipes can follow. */
    @Column(name = "target_type", nullable = false)
    private String targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    /** Denormalised for the inbox list — no lookups needed to render a row. */
    @Column(name = "item_title")
    private String itemTitle;

    @Column(name = "item_image_url")
    private String itemImageUrl;

    @Column(name = "item_link")
    private String itemLink;

    /** OPEN | CLOSED (closed by an admin or a participant). */
    private String status;

    @Column(name = "last_preview", length = 200)
    private String lastPreview;

    @Column(name = "last_sender_id")
    private Long lastSenderId;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;

    @Column(name = "seller_unread")
    private int sellerUnread;

    @Column(name = "buyer_unread")
    private int buyerUnread;

    /** Last time we emailed each side — throttles notification emails per thread. */
    @Column(name = "seller_emailed_at")
    private LocalDateTime sellerEmailedAt;

    @Column(name = "buyer_emailed_at")
    private LocalDateTime buyerEmailedAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "created_date")
    private LocalDateTime createdDate;

    // Display-only, filled by the service for the caller's perspective.
    @Transient private String sellerName;
    @Transient private String sellerHandle;
    @Transient private String buyerName;
    @Transient private String buyerHandle;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getSellerId() { return sellerId; }
    public void setSellerId(Long sellerId) { this.sellerId = sellerId; }
    public Long getBuyerId() { return buyerId; }
    public void setBuyerId(Long buyerId) { this.buyerId = buyerId; }
    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }
    public Long getTargetId() { return targetId; }
    public void setTargetId(Long targetId) { this.targetId = targetId; }
    public String getItemTitle() { return itemTitle; }
    public void setItemTitle(String itemTitle) { this.itemTitle = itemTitle; }
    public String getItemImageUrl() { return itemImageUrl; }
    public void setItemImageUrl(String itemImageUrl) { this.itemImageUrl = itemImageUrl; }
    public String getItemLink() { return itemLink; }
    public void setItemLink(String itemLink) { this.itemLink = itemLink; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getLastPreview() { return lastPreview; }
    public void setLastPreview(String lastPreview) { this.lastPreview = lastPreview; }
    public Long getLastSenderId() { return lastSenderId; }
    public void setLastSenderId(Long lastSenderId) { this.lastSenderId = lastSenderId; }
    public LocalDateTime getLastMessageAt() { return lastMessageAt; }
    public void setLastMessageAt(LocalDateTime lastMessageAt) { this.lastMessageAt = lastMessageAt; }
    public int getSellerUnread() { return sellerUnread; }
    public void setSellerUnread(int sellerUnread) { this.sellerUnread = sellerUnread; }
    public int getBuyerUnread() { return buyerUnread; }
    public void setBuyerUnread(int buyerUnread) { this.buyerUnread = buyerUnread; }
    public LocalDateTime getSellerEmailedAt() { return sellerEmailedAt; }
    public void setSellerEmailedAt(LocalDateTime t) { this.sellerEmailedAt = t; }
    public LocalDateTime getBuyerEmailedAt() { return buyerEmailedAt; }
    public void setBuyerEmailedAt(LocalDateTime t) { this.buyerEmailedAt = t; }
    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }
    public String getGuestName() { return guestName; }
    public void setGuestName(String guestName) { this.guestName = guestName; }
    public String getGuestEmail() { return guestEmail; }
    public void setGuestEmail(String guestEmail) { this.guestEmail = guestEmail; }
    public String getGuestPhone() { return guestPhone; }
    public void setGuestPhone(String guestPhone) { this.guestPhone = guestPhone; }
    /** True when the buyer is a visitor without an account. */
    public boolean isGuest() { return buyerId == null; }

    public String getSellerName() { return sellerName; }
    public void setSellerName(String sellerName) { this.sellerName = sellerName; }
    public String getSellerHandle() { return sellerHandle; }
    public void setSellerHandle(String sellerHandle) { this.sellerHandle = sellerHandle; }
    public String getBuyerName() { return buyerName; }
    public void setBuyerName(String buyerName) { this.buyerName = buyerName; }
    public String getBuyerHandle() { return buyerHandle; }
    public void setBuyerHandle(String buyerHandle) { this.buyerHandle = buyerHandle; }
}
