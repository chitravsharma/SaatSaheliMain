package com.SaatSaheli.spring.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import org.hibernate.envers.Audited;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "books")
@Audited
@EntityListeners(AuditingEntityListener.class)
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @Column(name = "user_id")
    private Long userId;

    private String status; // DRAFT, PUBLISHED, ARCHIVED

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "created_date")
    private LocalDateTime createdDate;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "modified_date")
    private LocalDateTime modifiedDate;

    private String category; // e.g., "Art", "Music", "Writing", "Tech", "Creativity", "Community"

    private String language; // "en", "hi", etc. — defaults to "en"

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;

    @LastModifiedBy
    @Column(name = "last_modified_by")
    private Long lastModifiedBy;

    @Transient
    private List<Page> pages = new ArrayList<>();

    @Transient
    private String authorName; // not persisted, enriched by service

    @Transient
    private int likeCount;

    @Transient
    private int commentCount;

    @Transient
    private String coverImageUrl; // cover page image URL, enriched from page 1

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }

    public LocalDateTime getModifiedDate() { return modifiedDate; }
    public void setModifiedDate(LocalDateTime modifiedDate) { this.modifiedDate = modifiedDate; }

    public List<Page> getPages() { return pages; }
    public void setPages(List<Page> pages) { this.pages = pages; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }

    public int getLikeCount() { return likeCount; }
    public void setLikeCount(int likeCount) { this.likeCount = likeCount; }

    public int getCommentCount() { return commentCount; }
    public void setCommentCount(int commentCount) { this.commentCount = commentCount; }

    public String getCoverImageUrl() { return coverImageUrl; }
    public void setCoverImageUrl(String coverImageUrl) { this.coverImageUrl = coverImageUrl; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }

    public Long getLastModifiedBy() { return lastModifiedBy; }
    public void setLastModifiedBy(Long lastModifiedBy) { this.lastModifiedBy = lastModifiedBy; }

    @Override
    public String toString() {
        return "Book [id=" + id + ", title=" + title + ", status=" + status + "]";
    }
}
