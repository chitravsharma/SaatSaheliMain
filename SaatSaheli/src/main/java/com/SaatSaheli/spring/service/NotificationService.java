package com.SaatSaheli.spring.service;

import com.SaatSaheli.spring.model.Comment;
import com.SaatSaheli.spring.model.Notification;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Creates per-recipient notifications. Every public method is defensively
 * wrapped so a failure here can never break the originating action (e.g.
 * posting a comment must still succeed even if notification creation fails).
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private static final List<String> ADMIN_ROLES = List.of("ADMIN", "SUPER_ADMIN");

    @Autowired private NotificationRepository notificationRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private BookRepository bookRepo;
    @Autowired private ArticleRepository articleRepo;
    @Autowired private GalleryRepository galleryRepo;
    @Autowired private GalleryImageRepository galleryImageRepo;
    @Autowired private RecipeRepository recipeRepo;
    @Autowired private PodcastRepository podcastRepo;

    /** Small holder for the resolved content owner + display title. */
    private static class Target {
        final Long ownerId;
        final String title;
        Target(Long ownerId, String title) { this.ownerId = ownerId; this.title = title; }
    }

    /**
     * Fan out notifications for a newly created comment: one to the content
     * creator (unless they commented on their own item), plus a monitoring
     * copy to every admin/super-admin.
     */
    public void notifyOnComment(Comment comment) {
        if (comment == null) return;
        try {
            String targetType = comment.getTargetType();
            Long targetId = comment.getTargetId();
            Long actorId = comment.getUserId();
            String actorName = comment.getUserName() != null ? comment.getUserName() : "Someone";

            Target target = resolveTarget(targetType, targetId);
            if (target == null) {
                log.debug("No owner resolvable for comment on {}#{}; skipping notification", targetType, targetId);
                return;
            }
            String title = (target.title != null && !target.title.isBlank()) ? target.title : "your content";
            String message = actorName + " commented on \"" + title + "\"";

            // Personal notification for the creator (skip self-comments and guest/anon owners).
            Long creatorId = target.ownerId;
            if (creatorId != null && creatorId > 0 && !creatorId.equals(actorId)) {
                save(creatorId, comment, targetType, targetId, title, message, false);
            }

            // Monitoring copy for each admin / super-admin.
            List<User> admins = userRepo.findByRoleIn(ADMIN_ROLES);
            for (User admin : admins) {
                Long adminId = admin.getId();
                if (adminId == null) continue;
                if (adminId.equals(actorId)) continue;                      // don't notify the commenter
                if (creatorId != null && adminId.equals(creatorId)) continue; // creator already has a personal row
                save(adminId, comment, targetType, targetId, title, message, true);
            }
        } catch (Exception e) {
            log.error("Failed to create comment notifications for comment {}: {}",
                    comment.getId(), e.getMessage(), e);
        }
    }

    private void save(Long recipientUserId, Comment comment, String targetType, Long targetId,
                      String title, String message, boolean adminCopy) {
        try {
            Notification n = new Notification();
            n.setRecipientUserId(recipientUserId);
            n.setActorUserId(comment.getUserId());
            n.setActorName(comment.getUserName());
            n.setType("COMMENT");
            n.setTargetType(targetType);
            n.setTargetId(targetId);
            n.setTargetTitle(title);
            n.setCommentId(comment.getId());
            n.setMessage(message);
            n.setRead(false);
            n.setAdminCopy(adminCopy);
            n.setCreatedDate(LocalDateTime.now());
            notificationRepo.save(n);
        } catch (Exception e) {
            log.error("Failed to save notification for recipient {}: {}", recipientUserId, e.getMessage());
        }
    }

    /** Resolve the content owner id and a human-readable title for a target. */
    private Target resolveTarget(String targetType, Long targetId) {
        if (targetType == null || targetId == null) return null;
        switch (targetType.toUpperCase()) {
            case "BOOK":
                return bookRepo.findById(targetId)
                        .map(b -> new Target(b.getUserId(), b.getTitle())).orElse(null);
            case "ARTICLE":
                return articleRepo.findById(targetId)
                        .map(a -> new Target(a.getUserId(), a.getHeadline())).orElse(null);
            case "GALLERY":
                return galleryRepo.findById(targetId)
                        .map(g -> new Target(g.getUserId(), g.getTitle())).orElse(null);
            case "GALLERY_IMAGE":
                // Comment target is the image; resolve up to its owning gallery.
                return galleryImageRepo.findById(targetId)
                        .flatMap(img -> galleryRepo.findById(img.getGalleryId()))
                        .map(g -> new Target(g.getUserId(), g.getTitle())).orElse(null);
            case "RECIPE":
                return recipeRepo.findById(targetId)
                        .map(r -> new Target(r.getUserId(), r.getRecipeName())).orElse(null);
            case "PODCAST":
                return podcastRepo.findById(targetId)
                        .map(p -> new Target(p.getUserId(), p.getTitle())).orElse(null);
            default:
                return null;
        }
    }

    // ── Read API (used by NotificationController) ──

    public List<Notification> getForUser(Long userId) {
        return notificationRepo.findTop50ByRecipientUserIdOrderByCreatedDateDesc(userId);
    }

    public long getUnreadCount(Long userId) {
        return notificationRepo.countByRecipientUserIdAndReadFalse(userId);
    }

    /** Mark one notification read, only if it belongs to the given user. Returns true if updated. */
    public boolean markRead(Long notificationId, Long userId) {
        return notificationRepo.findById(notificationId)
                .filter(n -> userId.equals(n.getRecipientUserId()))
                .map(n -> {
                    if (!n.isRead()) {
                        n.setRead(true);
                        notificationRepo.save(n);
                    }
                    return true;
                }).orElse(false);
    }

    public int markAllRead(Long userId) {
        return notificationRepo.markAllRead(userId);
    }
}
