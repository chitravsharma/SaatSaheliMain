package com.SaatSaheli.spring.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Audit row for every outbound email attempt. Written by EmailService regardless
 * of outcome, so admins can answer "did we email X, and did the mail server take
 * it?" long after the application log has rotated. Delivery to the inbox itself
 * is not observable from here — SENT means the SMTP server accepted the message.
 */
@Entity
@Table(name = "email_log", indexes = {
    @Index(name = "idx_email_log_sent_date", columnList = "sent_date"),
    @Index(name = "idx_email_log_related", columnList = "related_type, related_id"),
    @Index(name = "idx_email_log_recipient", columnList = "recipient")
})
public class EmailLog {

    public static final String STATUS_SENT = "SENT";
    public static final String STATUS_FAILED = "FAILED";
    /** Not attempted — app.email.enabled=false (dev/test). */
    public static final String STATUS_SKIPPED = "SKIPPED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** What kind of email: SUBMISSION_ACK, CONTACT_ADMIN, PASSWORD_RESET, COMMENT, MESSAGE, ORDER_CONFIRMATION, TEST. */
    @Column(name = "kind", length = 40, nullable = false)
    private String kind;

    /** Intended recipient (the real address, even when dev redirects the mail elsewhere). */
    @Column(name = "recipient", length = 255, nullable = false)
    private String recipient;

    /** Where the mail was actually handed to SMTP — differs from recipient only under the dev redirect. */
    @Column(name = "delivered_to", length = 500)
    private String deliveredTo;

    @Column(name = "subject", length = 500)
    private String subject;

    /** Optional link to the originating record, e.g. CONTACT / 32, ORDER / 7. */
    @Column(name = "related_type", length = 40)
    private String relatedType;

    @Column(name = "related_id")
    private Long relatedId;

    /** Human reference shown to the user, e.g. tracking id M00032 or an order number. */
    @Column(name = "reference", length = 64)
    private String reference;

    @Column(name = "status", length = 16, nullable = false)
    private String status;

    @Column(name = "error", length = 1000)
    private String error;

    @Column(name = "sent_date", nullable = false)
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime sentDate;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }
    public String getRecipient() { return recipient; }
    public void setRecipient(String recipient) { this.recipient = recipient; }
    public String getDeliveredTo() { return deliveredTo; }
    public void setDeliveredTo(String deliveredTo) { this.deliveredTo = deliveredTo; }
    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
    public String getRelatedType() { return relatedType; }
    public void setRelatedType(String relatedType) { this.relatedType = relatedType; }
    public Long getRelatedId() { return relatedId; }
    public void setRelatedId(Long relatedId) { this.relatedId = relatedId; }
    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
    public LocalDateTime getSentDate() { return sentDate; }
    public void setSentDate(LocalDateTime sentDate) { this.sentDate = sentDate; }
}
