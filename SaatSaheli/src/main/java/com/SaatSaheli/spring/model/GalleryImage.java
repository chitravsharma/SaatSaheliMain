package com.SaatSaheli.spring.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "gallery_images")
public class GalleryImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "gallery_id")
    private Long galleryId;

    @Column(name = "image_url")
    private String imageUrl;

    private String caption;

    @Column(name = "order_index")
    private int orderIndex;

    // ── For Sale (Premium+) ──
    // Boolean (not boolean): rows created before this column existed are NULL.
    @Column(name = "for_sale", columnDefinition = "boolean default false")
    private Boolean forSale;

    /** Free-form display price, e.g. "₹5,000", "$120", "Ask for price". */
    @Column(name = "sale_price")
    private String salePrice;

    /** AVAILABLE | SOLD (only meaningful when forSale). */
    @Column(name = "sale_status")
    private String saleStatus;

    /** Creator's note to buyers — size, medium, shipping, how to pay. */
    @Column(name = "sale_note", columnDefinition = "TEXT")
    private String saleNote;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "created_date")
    private LocalDateTime createdDate;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getGalleryId() { return galleryId; }
    public void setGalleryId(Long galleryId) { this.galleryId = galleryId; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getCaption() { return caption; }
    public void setCaption(String caption) { this.caption = caption; }

    public int getOrderIndex() { return orderIndex; }
    public void setOrderIndex(int orderIndex) { this.orderIndex = orderIndex; }

    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }

    public boolean isForSale() { return Boolean.TRUE.equals(forSale); }
    public void setForSale(boolean forSale) { this.forSale = forSale; }

    public String getSalePrice() { return salePrice; }
    public void setSalePrice(String salePrice) { this.salePrice = salePrice; }

    public String getSaleStatus() { return saleStatus; }
    public void setSaleStatus(String saleStatus) { this.saleStatus = saleStatus; }

    public String getSaleNote() { return saleNote; }
    public void setSaleNote(String saleNote) { this.saleNote = saleNote; }
}
