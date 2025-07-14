package com.SaatSaheli.spring.model;
import com.fasterxml.jackson.annotation.JsonBackReference;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

@Entity
public class Page {
    public Page() {
		super();
		// TODO Auto-generated constructor stub
	}

	public Page(Long id, int pageNumber, String content, String imageUrl, String imageUrl2, String format, Book book) {
		super();
		this.id = id;
		this.pageNumber = pageNumber;
		this.content = content;
		this.imageUrl = imageUrl;
		this.imageUrl2 = imageUrl2;
		this.format = format;
		this.book = book;
	}

	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private int pageNumber;

    @Column(columnDefinition = "TEXT")
    private String content;
    private String imageUrl;// Optional field for image support
    private String imageUrl2; 
    private String format;   // e.g., "bold", "italic", "custom json"
  
    @JsonBackReference
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id")
    private Book book;

	/*
	 * public Page(int i, String string, Object object, String string2, Book book2)
	 * { // TODO Auto-generated constructor stub }
	 */

	/**
	 * @return the id
	 */
	public Long getId() {
		return id;
	}

	/**
	 * @param id the id to set
	 */
	public void setId(Long id) {
		this.id = id;
	}

	/**
	 * @return the pageNumber
	 */
	public int getPageNumber() {
		return pageNumber;
	}

	/**
	 * @param pageNumber the pageNumber to set
	 */
	public void setPageNumber(int pageNumber) {
		this.pageNumber = pageNumber;
	}

	/**
	 * @return the content
	 */
	public String getContent() {
		return content;
	}

	/**
	 * @param content the content to set
	 */
	public void setContent(String content) {
		this.content = content;
	}

	/**
	 * @return the book
	 */
	public Book getBook() {
		return book;
	}

	/**
	 * @param book the book to set
	 */
	public void setBook(Book book) {
		this.book = book;
	}

	/**
	 * @return the imageUrl
	 */
	public String getImageUrl() {
		return imageUrl;
	}

	/**
	 * @param imageUrl the imageUrl to set
	 */
	public void setImageUrl(String imageUrl) {
		this.imageUrl = imageUrl;
	}

	/**
	 * @return the imageUrl2
	 */
	public String getImageUrl2() {
		return imageUrl2;
	}

	/**
	 * @param imageUrl2 the imageUrl2 to set
	 */
	public void setImageUrl2(String imageUrl2) {
		this.imageUrl2 = imageUrl2;
	}

	public String getFormat() {
		return format;
	}

	public void setFormat(String format) {
		this.format = format;
	}

	@Override
	public String toString() {
		return "Page [id=" + id + ", pageNumber=" + pageNumber + ", content=" + content + ", imageUrl=" + imageUrl
				+ ", imageUrl2=" + imageUrl2 + ", book=" + book + ",format=" + format +" ]";
	}

    // Getters and setters
}

