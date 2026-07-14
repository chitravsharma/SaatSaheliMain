package com.SaatSaheli.spring.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * A per-recipient notification. One row is created for each user who should be
 * told about an event (the content creator, and each admin/super-admin for
 * monitoring). Read-state is therefore tracked independently per recipient.
 */
@Entity
@Table(name = "notifications", indexes = {
    @Index(name = "idx_notifications_recipient", columnList = "recipient_user_id"),
    @Index(name = "idx_notifications_recipient_unread", columnList = "recipient_user_id, is_read")
})
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The user who receives (sees) this notification. */
    @Column(name = "recipient_user_id")
    private Long recipientUserId;

    /** The user who triggered the event (e.g. the commenter). */
    @Column(name = "actor_user_id")
    private Long actorUserId;

    @Column(name = "actor_name")
    private String actorName;

    /** COMMENT, FEEDBACK (extensible). */
    private String type;

    /** BOOK, ARTICLE, GALLERY, GALLERY_IMAGE, RECIPE, PODCAST, FEEDBACK. */
    @Column(name = "target_type")
    private String targetType;

    @Column(name = "target_id")
    private Long targetId;

    /** Denormalised item name so the panel can render without extra lookups. */
    @Column(name = "target_title")
    private String targetTitle;

    /** The originating comment, when applicable. */
    @Column(name = "comment_id")
    private Long commentId;

    /** Prebuilt display line, e.g. 'Asha commented on "Winter Recipes"'. */
    @Column(columnDefinition = "TEXT")
    private String message;

    /**
     * Resolved relative link to the item (e.g. "/read/4", "/gallery/12").
     * Stored because it can't always be derived from targetType+targetId alone
     * (a GALLERY_IMAGE comment links to its parent gallery, not the image id).
     */
    private String link;

    @Column(name = "is_read")
    private boolean read;

    /**
     * True when this is an admin/super-admin monitoring copy (not the creator's
     * personal notification). Lets the admin console filter site-wide activity.
     */
    @Column(name = "admin_copy")
    private boolean adminCopy;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "created_date")
    private LocalDateTime createdDate;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getRecipientUserId() { return recipientUserId; }
    public void setRecipientUserId(Long recipientUserId) { this.recipientUserId = recipientUserId; }

    public Long getActorUserId() { return actorUserId; }
    public void setActorUserId(Long actorUserId) { this.actorUserId = actorUserId; }

    public String getActorName() { return actorName; }
    public void setActorName(String actorName) { this.actorName = actorName; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }

    public Long getTargetId() { return targetId; }
    public void setTargetId(Long targetId) { this.targetId = targetId; }

    public String getTargetTitle() { return targetTitle; }
    public void setTargetTitle(String targetTitle) { this.targetTitle = targetTitle; }

    public Long getCommentId() { return commentId; }
    public void setCommentId(Long commentId) { this.commentId = commentId; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getLink() { return link; }
    public void setLink(String link) { this.link = link; }

    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }

    public boolean isAdminCopy() { return adminCopy; }
    public void setAdminCopy(boolean adminCopy) { this.adminCopy = adminCopy; }

    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }
}
