package com.SaatSaheli.spring.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "advertisements")
public class Advertisement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String title;

    @Column(name = "content_type")
    private String contentType; // "text", "html", "image"

    @Column(name = "html_content", columnDefinition = "TEXT")
    private String htmlContent;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "link_url")
    private String linkUrl;

    private String animation; // "static", "scroll", "blink"

    private String placement; // "HEADER_TOP", "FOOTER_TOP", "SIDE_RAIL"

    // Admin-controlled display dimensions (pixels). Nullable — falls back to CSS defaults when not set.
    private Integer width;
    private Integer height;

    private Boolean active;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "created_date")
    private LocalDateTime createdDate;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "modified_date")
    private LocalDateTime modifiedDate;

    @Transient
    private String creatorName;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public String getHtmlContent() { return htmlContent; }
    public void setHtmlContent(String htmlContent) { this.htmlContent = htmlContent; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getLinkUrl() { return linkUrl; }
    public void setLinkUrl(String linkUrl) { this.linkUrl = linkUrl; }

    public String getAnimation() { return animation; }
    public void setAnimation(String animation) { this.animation = animation; }

    public String getPlacement() { return placement; }
    public void setPlacement(String placement) { this.placement = placement; }

    public Integer getWidth() { return width; }
    public void setWidth(Integer width) { this.width = width; }

    public Integer getHeight() { return height; }
    public void setHeight(Integer height) { this.height = height; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }

    public LocalDateTime getModifiedDate() { return modifiedDate; }
    public void setModifiedDate(LocalDateTime modifiedDate) { this.modifiedDate = modifiedDate; }

    public String getCreatorName() { return creatorName; }
    public void setCreatorName(String creatorName) { this.creatorName = creatorName; }

    @Override
    public String toString() {
        return "Advertisement [id=" + id + ", title=" + title + ", active=" + active + "]";
    }
}
