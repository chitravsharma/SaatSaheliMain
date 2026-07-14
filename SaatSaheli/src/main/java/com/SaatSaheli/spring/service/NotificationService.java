package com.SaatSaheli.spring.service;

import com.SaatSaheli.spring.model.Comment;
import com.SaatSaheli.spring.model.ContactMessage;
import com.SaatSaheli.spring.model.Notification;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

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
    @Autowired private CommentRepository commentRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private BookRepository bookRepo;
    @Autowired private ArticleRepository articleRepo;
    @Autowired private GalleryRepository galleryRepo;
    @Autowired private GalleryImageRepository galleryImageRepo;
    @Autowired private RecipeRepository recipeRepo;
    @Autowired private PodcastRepository podcastRepo;
    @Autowired private EmailService emailService;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    /** How many days a notification stays visible in the bell before it's purged. */
    @Value("${app.notifications.retention-days:14}")
    private int retentionDays;

    /** Auto-run the backfill on startup so the bell is populated after a fresh deploy. */
    @Value("${app.notifications.backfill-on-startup:true}")
    private boolean backfillOnStartup;

    /**
     * After the app is ready, seed notifications from recent comments once.
     * Runs in the background (won't delay startup) and is idempotent, so it's
     * a no-op on every boot after the first.
     */
    @Async("notificationExecutor")
    @EventListener(ApplicationReadyEvent.class)
    public void backfillOnStartup() {
        if (!backfillOnStartup) return;
        try {
            int processed = backfillRecentComments(retentionDays);
            if (processed > 0) log.info("Startup notification backfill seeded {} comment(s)", processed);
        } catch (Exception e) {
            log.error("Startup notification backfill failed: {}", e.getMessage());
        }
    }

    private LocalDateTime retentionCutoff() {
        return LocalDateTime.now().minusDays(retentionDays);
    }

    /** Resolved content owner, display title, deep link and a human item label. */
    private static class Target {
        final Long ownerId;
        final String title;
        final String link;      // relative, e.g. "/read/4"
        final String itemLabel; // human word, e.g. "book"
        Target(Long ownerId, String title, String link, String itemLabel) {
            this.ownerId = ownerId; this.title = title; this.link = link; this.itemLabel = itemLabel;
        }
    }

    /**
     * Fan out notifications for a newly created comment: one to the content
     * creator (unless they commented on their own item), plus a monitoring
     * copy to every admin/super-admin.
     */
    @Async("notificationExecutor")
    public void notifyOnComment(Comment comment) {
        if (comment == null) return;
        try {
            fanOut(comment, true, LocalDateTime.now());
        } catch (Exception e) {
            log.error("Failed to create comment notifications for comment {}: {}",
                    comment.getId(), e.getMessage(), e);
        }
    }

    /**
     * Core fan-out shared by live notifications and the backfill.
     * @param sendEmail   email the creator (live only; the backfill stays silent)
     * @param whenCreated timestamp to stamp on the notifications (live = now,
     *                    backfill = the comment's original date so ordering is natural)
     */
    private void fanOut(Comment comment, boolean sendEmail, LocalDateTime whenCreated) {
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
            save(creatorId, comment, targetType, targetId, title, target.link, message, false, whenCreated);
            if (sendEmail) emailCreator(creatorId, actorName, target, comment.getContent());
        }

        // Monitoring copy for each admin / super-admin (in-app only, no email flood).
        List<User> admins = userRepo.findByRoleIn(ADMIN_ROLES);
        for (User admin : admins) {
            Long adminId = admin.getId();
            if (adminId == null) continue;
            if (adminId.equals(actorId)) continue;                      // don't notify the commenter
            if (creatorId != null && adminId.equals(creatorId)) continue; // creator already has a personal row
            save(adminId, comment, targetType, targetId, title, target.link, message, true, whenCreated);
        }
    }

    /**
     * One-time backfill: generate notifications for existing comments from the
     * last N days that never produced any (e.g. comments made before the feature
     * shipped). Silent (no emails), idempotent (skips comments already notified),
     * and preserves the original comment date. Returns the count of comments processed.
     */
    public int backfillRecentComments(int days) {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(days);
        List<Comment> recent = commentRepo.findByCreatedDateAfterAndIsDeletedFalseOrderByCreatedDateAsc(cutoff);
        int processed = 0;
        for (Comment c : recent) {
            try {
                if (notificationRepo.existsByCommentId(c.getId())) continue; // already notified
                LocalDateTime when = c.getCreatedDate() != null ? c.getCreatedDate() : LocalDateTime.now();
                fanOut(c, false, when);
                processed++;
            } catch (Exception e) {
                log.error("Backfill failed for comment {}: {}", c.getId(), e.getMessage());
            }
        }
        log.info("Notification backfill processed {} comment(s) from the last {} days", processed, days);
        return processed;
    }

    private void save(Long recipientUserId, Comment comment, String targetType, Long targetId,
                      String title, String link, String message, boolean adminCopy, LocalDateTime createdDate) {
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
            n.setLink(link);
            n.setRead(false);
            n.setAdminCopy(adminCopy);
            n.setCreatedDate(createdDate);
            notificationRepo.save(n);
        } catch (Exception e) {
            log.error("Failed to save notification for recipient {}: {}", recipientUserId, e.getMessage());
        }
    }

    /** Email the content creator about a new comment. Non-fatal (mail may be unconfigured). */
    private void emailCreator(Long creatorId, String actorName, Target target, String commentContent) {
        try {
            Optional<User> creatorOpt = userRepo.findById(creatorId);
            if (creatorOpt.isEmpty()) return;
            User creator = creatorOpt.get();
            String email = creator.getEmail();
            if (email == null || email.isBlank()) return;

            String recipientName = creator.getDisplayName() != null && !creator.getDisplayName().isBlank()
                    ? creator.getDisplayName() : creator.getFirstName();
            String snippet = commentContent == null ? ""
                    : (commentContent.length() > 300 ? commentContent.substring(0, 300) + "…" : commentContent);
            String absoluteLink = frontendUrl + (target.link != null ? target.link : "");

            emailService.sendCommentNotification(email, recipientName, actorName,
                    target.itemLabel, target.title, snippet, absoluteLink);
        } catch (Exception e) {
            log.warn("Failed to email creator {} about comment: {}", creatorId, e.getMessage());
        }
    }

    /** Resolve the content owner, title, deep link and label for a comment target. */
    private Target resolveTarget(String targetType, Long targetId) {
        if (targetType == null || targetId == null) return null;
        // ?focus=comments tells each item view to auto-open + scroll to the comment section.
        switch (targetType.toUpperCase()) {
            case "BOOK":
                return bookRepo.findById(targetId)
                        .map(b -> new Target(b.getUserId(), b.getTitle(), "/read/" + targetId + "?focus=comments", "book")).orElse(null);
            case "ARTICLE":
                // Blogs live at /blogs/:id and poems at /poems/:id; the Articles view
                // filters by the route's content type, so use the right path or the
                // item gets filtered out.
                return articleRepo.findById(targetId)
                        .map(a -> {
                            String ct = a.getContentType() == null ? "" : a.getContentType();
                            String path; String label;
                            if ("Poetry".equalsIgnoreCase(ct)) { path = "/poems/"; label = "poem"; }
                            else if ("Blog".equalsIgnoreCase(ct)) { path = "/blogs/"; label = "blog"; }
                            else { path = "/articles/"; label = "article"; }
                            return new Target(a.getUserId(), a.getHeadline(),
                                    path + targetId + "?focus=comments", label);
                        }).orElse(null);
            case "GALLERY":
                return galleryRepo.findById(targetId)
                        .map(g -> new Target(g.getUserId(), g.getTitle(), "/gallery/" + targetId + "?focus=comments", "gallery")).orElse(null);
            case "GALLERY_IMAGE":
                // Comment target is the image; resolve up to its owning gallery for owner + link.
                return galleryImageRepo.findById(targetId)
                        .flatMap(img -> galleryRepo.findById(img.getGalleryId()))
                        .map(g -> new Target(g.getUserId(), g.getTitle(), "/gallery/" + g.getId() + "?focus=comments", "gallery")).orElse(null);
            case "RECIPE":
                return recipeRepo.findById(targetId)
                        .map(r -> new Target(r.getUserId(), r.getRecipeName(), "/recipes/" + targetId + "?focus=comments", "recipe")).orElse(null);
            case "PODCAST":
                return podcastRepo.findById(targetId)
                        .map(p -> new Target(p.getUserId(), p.getTitle(), "/podcasts", "podcast")).orElse(null);
            default:
                return null;
        }
    }

    /**
     * Notify all admins/super-admins in-app that new feedback/contact was submitted.
     * (Admin email already goes out separately from ContactController.) Non-fatal.
     */
    @Async("notificationExecutor")
    public void notifyOnFeedback(ContactMessage msg) {
        if (msg == null) return;
        try {
            String name = msg.getName() != null ? msg.getName() : "Someone";
            String subject = (msg.getSubject() != null && !msg.getSubject().isBlank())
                    ? msg.getSubject() : "Feedback";
            String message = "New feedback from " + name + ": " + subject;

            List<User> admins = userRepo.findByRoleIn(ADMIN_ROLES);
            for (User admin : admins) {
                Long adminId = admin.getId();
                if (adminId == null) continue;
                Notification n = new Notification();
                n.setRecipientUserId(adminId);
                n.setActorName(name);
                n.setType("FEEDBACK");
                n.setTargetType("FEEDBACK");
                n.setTargetId(msg.getId());
                n.setTargetTitle(subject);
                n.setMessage(message);
                n.setLink("/admin");
                n.setRead(false);
                n.setAdminCopy(true);
                n.setCreatedDate(LocalDateTime.now());
                notificationRepo.save(n);
            }
        } catch (Exception e) {
            log.error("Failed to create feedback notifications for contact message {}: {}",
                    msg.getId(), e.getMessage(), e);
        }
    }

    // ── Read API (used by NotificationController) ──

    public List<Notification> getForUser(Long userId) {
        return notificationRepo.findTop50ByRecipientUserIdAndCreatedDateAfterOrderByCreatedDateDesc(
                userId, retentionCutoff());
    }

    public long getUnreadCount(Long userId) {
        return notificationRepo.countByRecipientUserIdAndReadFalseAndCreatedDateAfter(
                userId, retentionCutoff());
    }

    /**
     * Purge notifications older than the retention window. Runs weekly, Sunday
     * at 03:15. Notifications stay in every recipient's bell for the full window
     * regardless of read state; only after it lapses are they removed for everyone.
     */
    @Scheduled(cron = "0 15 3 * * SUN")
    public void purgeOldNotifications() {
        try {
            int deleted = notificationRepo.deleteByCreatedDateBefore(retentionCutoff());
            if (deleted > 0) {
                log.info("Purged {} notification(s) older than {} days", deleted, retentionDays);
            }
        } catch (Exception e) {
            log.error("Notification retention purge failed: {}", e.getMessage());
        }
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
