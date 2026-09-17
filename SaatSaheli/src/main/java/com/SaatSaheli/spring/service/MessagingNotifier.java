package com.SaatSaheli.spring.service;

import com.SaatSaheli.spring.model.Conversation;
import com.SaatSaheli.spring.model.ConversationMessage;
import com.SaatSaheli.spring.model.Notification;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.ConversationRepository;
import com.SaatSaheli.spring.repository.NotificationRepository;
import com.SaatSaheli.spring.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Off-thread delivery for private-message notifications (bell + throttled email).
 * Separate bean so the @Async proxy is honoured when MessagingService calls it.
 */
@Service
public class MessagingNotifier {

    private static final Logger log = LoggerFactory.getLogger(MessagingNotifier.class);

    /** Email at most once per thread per side within this window. */
    private static final Duration EMAIL_THROTTLE = Duration.ofMinutes(15);

    @Autowired private ConversationRepository convRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private NotificationRepository notificationRepo;
    @Autowired private EmailService emailService;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    /** Bell notification always; email at most once per 15 min per thread per side. */
    @Async("notificationExecutor")
    public void notifyRecipient(Conversation c, ConversationMessage m, Long recipientId, boolean senderIsSeller) {
        try {
            User recipient = userRepo.findById(recipientId).orElse(null);
            if (recipient == null) return;
            String link = "/messages/" + c.getId();

            Notification n = new Notification();
            n.setRecipientUserId(recipientId);
            n.setActorUserId(m.getSenderId());
            n.setActorName(m.getSenderName());
            n.setType("MESSAGE");
            n.setTargetType("CONVERSATION");
            n.setTargetId(c.getId());
            n.setTargetTitle(c.getItemTitle());
            n.setMessage(m.getSenderName() + " sent you a message about \"" + c.getItemTitle() + "\"");
            n.setLink(link);
            n.setRead(false);
            n.setAdminCopy(false);
            n.setCreatedDate(LocalDateTime.now());
            notificationRepo.save(n);

            LocalDateTime lastEmail = senderIsSeller ? c.getBuyerEmailedAt() : c.getSellerEmailedAt();
            if (lastEmail != null && Duration.between(lastEmail, LocalDateTime.now()).compareTo(EMAIL_THROTTLE) < 0) return;
            if (recipient.getEmail() == null || recipient.getEmail().isBlank()) return;
            String emailBody = m.getBody();
            if (c.isGuest()) {
                emailBody = "From: " + c.getGuestName() + "\nEmail: " + c.getGuestEmail() + "\nPhone: " + c.getGuestPhone()
                        + "\n\n" + m.getBody() + "\n\n(This buyer has no SaatSaheli inbox — reply to them by email or phone.)";
            }
            emailService.sendMessageNotification(recipient.getEmail(), MessagingService.displayName(recipient), m.getSenderName(),
                    c.getItemTitle(), emailBody, frontendUrl + link);
            Conversation fresh = convRepo.findById(c.getId()).orElse(null);
            if (fresh != null) {
                if (senderIsSeller) fresh.setBuyerEmailedAt(LocalDateTime.now()); else fresh.setSellerEmailedAt(LocalDateTime.now());
                convRepo.save(fresh);
            }
        } catch (Exception e) {
            log.warn("Message notification failed for conversation {}: {}", c.getId(), e.getMessage());
        }
    }
}
