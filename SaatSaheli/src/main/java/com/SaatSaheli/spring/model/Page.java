package com.SaatSaheli.spring.model;

public class Page {
    private Long id;
    private Long bookId;
    private int pageNumber;
    private String content;
    private String imageUrl;
    private String imageUrl2;
    private String format; // e.g., "bold", "italic", "custom json"
    private String createdDate;
    private String modifiedDate;

    public Page() {}

    public Page(Long id, Long bookId, int pageNumber, String content, String imageUrl, String imageUrl2, String format) {
        this.id = id;
        this.bookId = bookId;
        this.pageNumber = pageNumber;
        this.content = content;
        this.imageUrl = imageUrl;
        this.imageUrl2 = imageUrl2;
        this.format = format;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getBookId() { return bookId; }
    public void setBookId(Long bookId) { this.bookId = bookId; }

    public int getPageNumber() { return pageNumber; }
    public void setPageNumber(int pageNumber) { this.pageNumber = pageNumber; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getImageUrl2() { return imageUrl2; }
    public void setImageUrl2(String imageUrl2) { this.imageUrl2 = imageUrl2; }

    public String getFormat() { return format; }
    public void setFormat(String format) { this.format = format; }

    public String getCreatedDate() { return createdDate; }
    public void setCreatedDate(String createdDate) { this.createdDate = createdDate; }

    public String getModifiedDate() { return modifiedDate; }
    public void setModifiedDate(String modifiedDate) { this.modifiedDate = modifiedDate; }

    @Override
    public String toString() {
        return "Page [id=" + id + ", bookId=" + bookId + ", pageNumber=" + pageNumber + ", content=" + content + "]";
    }
}
