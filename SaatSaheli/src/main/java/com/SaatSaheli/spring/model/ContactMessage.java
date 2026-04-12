package com.SaatSaheli.spring.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "contact_messages")
public class ContactMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String email;

    private String subject;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    // Stored in UTC. The 'Z' literal in the JSON pattern marks the serialized
    // string as UTC so the browser parses it correctly and can re-format it
    // into any display timezone (the admin UI shows it as PST).
    @Column(name = "created_date")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'", timezone = "UTC")
    private LocalDateTime createdDate;

    @Column(name = "status")
    private String status = "NEW";

    @Column(name = "rating")
    private String rating;

    @Column(name = "category")
    private String category;

    @Column(name = "updated_date")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'", timezone = "UTC")
    private LocalDateTime updatedDate;

    // Public-facing reference users can quote when following up on a submission.
    // Format: SS-MAG-XXXXXX (magazine), SS-SUP-XXXXXX (help & support), SS-MSG-XXXXXX (other).
    @Column(name = "tracking_id", length = 32)
    private String trackingId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }

    public String getStatus() { return status != null ? status : "NEW"; }
    public void setStatus(String status) { this.status = status; }

    public String getRating() { return rating; }
    public void setRating(String rating) { this.rating = rating; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public LocalDateTime getUpdatedDate() { return updatedDate; }
    public void setUpdatedDate(LocalDateTime updatedDate) { this.updatedDate = updatedDate; }

    public String getTrackingId() { return trackingId; }
    public void setTrackingId(String trackingId) { this.trackingId = trackingId; }
}
