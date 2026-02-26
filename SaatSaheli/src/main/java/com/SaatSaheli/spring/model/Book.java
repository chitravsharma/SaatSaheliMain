package com.SaatSaheli.spring.model;

import java.util.ArrayList;
import java.util.List;

public class Book {
    private Long id;
    private String title;
    private Long userId;
    private String status; // DRAFT, PUBLISHED, ARCHIVED
    private String createdDate;
    private String modifiedDate;
    private String category; // e.g., "Art", "Music", "Writing", "Tech", "Creativity", "Community"
    private List<Page> pages = new ArrayList<>();
    private String authorName; // transient - not persisted to sheet, enriched by service

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCreatedDate() { return createdDate; }
    public void setCreatedDate(String createdDate) { this.createdDate = createdDate; }

    public String getModifiedDate() { return modifiedDate; }
    public void setModifiedDate(String modifiedDate) { this.modifiedDate = modifiedDate; }

    public List<Page> getPages() { return pages; }
    public void setPages(List<Page> pages) { this.pages = pages; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }

    @Override
    public String toString() {
        return "Book [id=" + id + ", title=" + title + ", status=" + status + "]";
    }
}
