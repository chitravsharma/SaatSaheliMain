package com.SaatSaheli.spring.model;

import java.util.ArrayList;
import java.util.List;

import com.SaatSaheli.spring.model.Page;
import com.fasterxml.jackson.annotation.JsonManagedReference;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;

@Entity
public class Book {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String title;
    
    @JsonManagedReference
   @OneToMany(mappedBy = "book")
    	/*	cascade = CascadeType.ALL)*/
    private List<Page> pages = new ArrayList<>();

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
	 * @return the title
	 */
	public String getTitle() {
		return title;
	}

	/**
	 * @param title the title to set
	 */
	public void setTitle(String title) {
		this.title = title;
	}

	/**
	 * @return the pages
	 */
	public List<Page> getPages() {
		return pages;
	}

	/**
	 * @param pages the pages to set
	 */
	public void setPages(List<Page> pages) {
		this.pages = pages;
	}

	@Override
	public String toString() {
		return "Book [id=" + id + ", title=" + title + ", pages=" + pages + ", getId()=" + getId() + ", getTitle()="
				+ getTitle() + ", getPages()=" + getPages() + ", getClass()=" + getClass() + ", hashCode()="
				+ hashCode() + ", toString()=" + super.toString() + "]";
	}

    // Getters and setters
}
