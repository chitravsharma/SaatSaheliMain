package com.SaatSaheli.spring.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hero_slides")
public class HeroSlide {

    @Id
    @Column(nullable = false)
    private Integer slot;

    @Column(length = 120)
    private String name;

    // What the admin actually pasted — page URL on the site (e.g. "/read/44") OR a direct image URL.
    @Column(name = "source_url", columnDefinition = "TEXT")
    private String sourceUrl;

    // Resolved direct image URL — what the public GET returns and the home page renders.
    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_by")
    private Long updatedBy;

    public Integer getSlot() { return slot; }
    public void setSlot(Integer slot) { this.slot = slot; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public Long getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
}
