package com.SaatSaheli.spring.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Size ledger for every object we put on R2, keyed by its public URL. Storage
 * usage per user is computed from the URLs their content references (galleries,
 * book pages, recipe/article images, profile photo) joined to this table — so
 * deleting content lowers usage without hooking every delete path.
 */
@Entity
@Table(name = "media_assets", indexes = @Index(name = "idx_media_assets_url", columnList = "url", unique = true))
public class MediaAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 1000)
    private String url;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "content_type")
    private String contentType;

    @Column(name = "created_date")
    private LocalDateTime createdDate;

    public MediaAsset() {}

    public MediaAsset(String url, long sizeBytes, String contentType) {
        this.url = url;
        this.sizeBytes = sizeBytes;
        this.contentType = contentType;
        this.createdDate = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public long getSizeBytes() { return sizeBytes; }
    public void setSizeBytes(long sizeBytes) { this.sizeBytes = sizeBytes; }
    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }
}
