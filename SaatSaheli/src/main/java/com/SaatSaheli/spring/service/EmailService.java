package com.SaatSaheli.spring.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

import com.SaatSaheli.spring.model.MarketplaceOrder;
import com.SaatSaheli.spring.model.OrderItem;

import java.math.BigDecimal;
import java.util.Map;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private static final Map<String, String> CURRENCY_SYMBOL = Map.of("inr", "₹", "usd", "$");

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private EmailLogService emailLogService;

    @Value("${mail.from:avikaventures.info@gmail.com}")
    private String fromAddress;

    /**
     * Master switch for real email delivery. Set false in dev/test so local
     * runs never send mail to real users (comments, orders, password resets).
     */
    @Value("${app.email.enabled:true}")
    private boolean emailEnabled;

    /**
     * Dev-only catch-all. When set (comma-separated), every outgoing email is
     * redirected to these addresses instead of the real recipient, and the
     * intended recipient is stamped into the subject. Overrides emailEnabled so
     * you can test real delivery to safe inboxes. Empty in prod.
     */
    @Value("${app.email.redirect-to:}")
    private String redirectTo;

    /**
     * Send a password reset email with the temporary password.
     */
    public void sendPasswordResetEmail(String toEmail, String tempPassword) {
        String subject = "SaatSaheli — Password Reset";
        String body = """
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
                  <h2 style="color: #2563eb;">Password Reset</h2>
                  <p>Hi,</p>
                  <p>We received a request to reset your password. Here is your temporary password:</p>
                  <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
                    <code style="font-size: 1.4rem; font-weight: 700; letter-spacing: 2px; color: #1e3a5f;">%s</code>
                  </div>
                  <p>Use this temporary password to log in, then change your password from your account settings.</p>
                  <p style="color: #9ca3af; font-size: 0.9rem;">If you did not request a password reset, please ignore this email. This temporary password will work until you or someone else resets it again.</p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                  <p style="color: #9ca3af; font-size: 0.85rem;">— The SaatSaheli Team</p>
                </div>
                """.formatted(tempPassword);

        sendHtmlEmail(toEmail, subject, body, "PASSWORD_RESET", null, null, null);
    }

    /**
     * Send a notification when a contact form is submitted.
     */
    public void sendContactNotification(String senderName, String senderEmail, String msgSubject, String message,
                                        Long contactId, String trackingId) {
        String formType = classifyContactForm(msgSubject);
        String heading = "Feedback".equals(formType) ? "New Feedback Received" : "New " + formType;
        String subject = "SaatSaheli — " + formType + " from " + senderName;
        String body = """
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
                  <h2 style="color: #2563eb;">%s</h2>
                  <table style="width: 100%%; border-collapse: collapse; margin: 16px 0;">
                    <tr><td style="padding: 8px 0; color: #6b7280; width: 80px;"><strong>From:</strong></td><td>%s</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;"><strong>Email:</strong></td><td><a href="mailto:%s">%s</a></td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;"><strong>Subject:</strong></td><td>%s</td></tr>
                  </table>
                  <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 16px 0; white-space: pre-wrap;">%s</div>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                  <p style="color: #9ca3af; font-size: 0.85rem;">Reply directly to the sender at <a href="mailto:%s">%s</a></p>
                </div>
                """.formatted(heading, senderName, senderEmail, senderEmail, msgSubject, message, senderEmail, senderEmail);

        sendHtmlEmail(fromAddress, subject, body, "CONTACT_ADMIN", "CONTACT", contactId, trackingId);
    }

    /**
     * Human label for a /api/contact submission, inferred from the subject prefix
     * each form stamps. Mirrors ContactController.formatTrackingId — keep in sync.
     */
    public static String classifyContactForm(String msgSubject) {
        if (msgSubject == null) return "Contact Us";
        if (msgSubject.startsWith("Magazine Submission:")) return "Magazine Submission";
        if (msgSubject.startsWith("Help & Support:")) return "Help & Support Request";
        if (msgSubject.toLowerCase().startsWith("feedback")) return "Feedback";
        if (msgSubject.startsWith("Advertise with SaatSaheli") || msgSubject.startsWith("Advertising")) {
            return "Advertising Inquiry";
        }
        return "Contact Us";
    }

    /**
     * Receipt sent to the person who submitted a contact/magazine/support form.
     * Carries the tracking id so they can quote it later — the on-screen confirmation
     * is the only other place they ever see it.
     */
    public void sendSubmissionAcknowledgement(String toEmail, String recipientName, String msgSubject, String trackingId,
                                              Long contactId) {
        String formType = classifyContactForm(msgSubject);
        String safeTracking = escape(trackingId != null ? trackingId : "");
        String greeting = (recipientName != null && !recipientName.isBlank())
                ? "Hi " + escape(recipientName) + "," : "Hi,";

        String intro;
        String nextSteps;
        switch (formType) {
            case "Magazine Submission" -> {
                intro = "Thank you for submitting your creative work to Saat Saheli Magazine. We've received it and it's now with our editorial team.";
                nextSteps = "Our editors review every submission personally, so this can take a little time. "
                        + "If your piece is selected we'll write to you at this address with next steps.";
            }
            case "Help & Support Request" -> {
                intro = "Thank you for reaching out to Saat Saheli support. We've received your request.";
                nextSteps = "A member of our team will look into it and reply to this address as soon as possible.";
            }
            case "Feedback" -> {
                intro = "Thank you for sharing your feedback with Saat Saheli — we read every message.";
                nextSteps = "If your note needs a reply, we'll get back to you at this address.";
            }
            case "Advertising Inquiry" -> {
                intro = "Thank you for your interest in advertising with Saat Saheli. We've received your inquiry.";
                nextSteps = "Our team will review it and reply to this address with details and next steps.";
            }
            default -> {
                intro = "Thank you for contacting Saat Saheli. We've received your message.";
                nextSteps = "We'll get back to you at this address as soon as we can.";
            }
        }

        String subject = "SaatSaheli — We received your " + formType.toLowerCase()
                + (safeTracking.isEmpty() ? "" : " (" + safeTracking + ")");
        String body = """
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
                  <h2 style="color: #b45309;">We received your %s</h2>
                  <p>%s</p>
                  <p>%s</p>
                  <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
                    <div style="color: #78350f; font-size: 0.85rem; margin-bottom: 6px;">Your tracking ID</div>
                    <code style="font-size: 1.3rem; font-weight: 700; letter-spacing: 2px; color: #78350f;">%s</code>
                  </div>
                  <p>%s</p>
                  <p style="color: #6b7280; font-size: 0.9rem;">Please keep this tracking ID and quote it if you write to us about this submission.</p>
                  <p style="color: #6b7280; font-size: 0.9rem;"><strong>Subject:</strong> %s</p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                  <p style="color: #9ca3af; font-size: 0.85rem;">You're receiving this because a form was submitted on SaatSaheli with this email address. If that wasn't you, you can safely ignore this message.<br/>— The SaatSaheli Team</p>
                </div>
                """.formatted(escape(formType.toLowerCase()), greeting, intro, safeTracking, nextSteps,
                escape(msgSubject != null ? msgSubject : ""));

        sendHtmlEmail(toEmail, subject, body, "SUBMISSION_ACK", "CONTACT", contactId, trackingId);
    }

    /**
     * Notify a content creator that someone commented on their item.
     * itemLabel is a human word for the content type (e.g. "book", "article").
     */
    public void sendCommentNotification(String toEmail, String recipientName, String actorName,
                                        String itemLabel, String itemTitle, String commentSnippet, String link) {
        String safeActor = escape(actorName != null ? actorName : "Someone");
        String safeTitle = escape(itemTitle != null ? itemTitle : "your " + itemLabel);
        String greeting = (recipientName != null && !recipientName.isBlank())
                ? "Hi " + escape(recipientName) + "," : "Hi,";
        String subject = "SaatSaheli — " + safeActor + " commented on your " + itemLabel;
        String body = """
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
                  <h2 style="color: #b45309;">New comment on your %s</h2>
                  <p>%s</p>
                  <p><strong>%s</strong> commented on <strong>"%s"</strong>:</p>
                  <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 16px 0; white-space: pre-wrap; color: #78350f;">%s</div>
                  <p style="margin: 24px 0;">
                    <a href="%s" style="background: #b45309; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; display: inline-block;">View comment</a>
                  </p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                  <p style="color: #9ca3af; font-size: 0.85rem;">You're receiving this because someone commented on content you created on SaatSaheli.<br/>— The SaatSaheli Team</p>
                </div>
                """.formatted(itemLabel, greeting, safeActor, safeTitle, escape(commentSnippet), link);

        sendHtmlEmail(toEmail, subject, body, "COMMENT", null, null, null);
    }

    /** New private message about an item For Sale (buyer ↔ seller). */
    public void sendMessageNotification(String toEmail, String recipientName, String senderName,
                                        String itemTitle, String messageBody, String link) {
        String safeSender = escape(senderName != null ? senderName : "Someone");
        String safeTitle = escape(itemTitle != null ? itemTitle : "an item");
        String greeting = (recipientName != null && !recipientName.isBlank())
                ? "Hi " + escape(recipientName) + "," : "Hi,";
        String snippet = messageBody == null ? "" : (messageBody.length() > 300 ? messageBody.substring(0, 300) + "…" : messageBody);
        String subject = "SaatSaheli — " + safeSender + " messaged you about \"" + safeTitle + "\"";
        String body = """
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
                  <h2 style="color: #b45309;">New message about "%s"</h2>
                  <p>%s</p>
                  <p><strong>%s</strong> wrote:</p>
                  <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 16px 0; white-space: pre-wrap; color: #78350f;">%s</div>
                  <p style="margin: 24px 0;">
                    <a href="%s" style="background: #b45309; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; display: inline-block;">Reply on SaatSaheli</a>
                  </p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                  <p style="color: #9ca3af; font-size: 0.85rem;">You're receiving this because of a private conversation about an item on SaatSaheli. Replies are only visible to you, the other party, and SaatSaheli admins.<br/>— The SaatSaheli Team</p>
                </div>
                """.formatted(safeTitle, greeting, safeSender, escape(snippet), link);
        sendHtmlEmail(toEmail, subject, body, "MESSAGE", null, null, null);
    }

    /**
     * Send the buyer an order/purchase confirmation with the confirmation number,
     * itemised list, total, and tracking status.
     */
    public void sendOrderConfirmation(String toEmail, MarketplaceOrder order) {
        String sym = symbolFor(order.getCurrency());
        StringBuilder rows = new StringBuilder();
        for (OrderItem item : order.getItems()) {
            rows.append("""
                    <tr>
                      <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">%s</td>
                      <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; white-space: nowrap;">%s%s</td>
                    </tr>
                    """.formatted(
                    escape(item.getTitle()),
                    sym, money(item.getPriceAmount())));
        }

        String tracking = (order.getTrackingNumber() != null && !order.getTrackingNumber().isBlank())
                ? escape(order.getTrackingNumber()) + (order.getTrackingCarrier() != null ? " (" + escape(order.getTrackingCarrier()) + ")" : "")
                : "Pending — you'll get an update when your order ships.";

        String subject = "SaatSaheli — Order Confirmation " + order.getOrderNumber();
        String body = """
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
                  <h2 style="color: #b45309;">Thank you for your order!</h2>
                  <p>Your payment was successful and your order is confirmed.</p>
                  <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
                    <div style="color: #92400e; font-size: 0.85rem; letter-spacing: 0.04em;">CONFIRMATION NUMBER</div>
                    <div style="font-size: 1.4rem; font-weight: 700; color: #78350f; letter-spacing: 1px;">%s</div>
                  </div>
                  <table style="width: 100%%; border-collapse: collapse; margin: 16px 0;">
                    %s
                    <tr>
                      <td style="padding: 12px 0; font-weight: 700;">Total</td>
                      <td style="padding: 12px 0; font-weight: 700; text-align: right;">%s%s</td>
                    </tr>
                  </table>
                  <p style="margin: 16px 0;"><strong>Tracking:</strong> %s</p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                  <p style="color: #9ca3af; font-size: 0.85rem;">Keep your confirmation number for any questions about this order.<br/>— The SaatSaheli Team</p>
                </div>
                """.formatted(
                escape(order.getOrderNumber()),
                rows.toString(),
                sym, money(order.getSubtotal()),
                tracking);

        sendHtmlEmail(toEmail, subject, body, "ORDER_CONFIRMATION", "ORDER", order.getId(), order.getOrderNumber());
    }

    private static String symbolFor(String currency) {
        return CURRENCY_SYMBOL.getOrDefault(currency == null ? "" : currency.toLowerCase(), "");
    }

    private static String money(BigDecimal amount) {
        return (amount == null ? BigDecimal.ZERO : amount).setScale(2, java.math.RoundingMode.HALF_UP).toPlainString();
    }

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    /**
     * Send a simple diagnostic email. Throws on failure so the caller can surface
     * the exact SMTP error (used by the super-admin test-email endpoint).
     */
    public void sendTestEmail(String to) {
        String subject = "SaatSaheli — Test email";
        String body = """
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                  <h2 style="color: #b45309;">Test email &#9989;</h2>
                  <p>If you're reading this, SaatSaheli's email delivery is working.</p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                  <p style="color: #9ca3af; font-size: 0.85rem;">&mdash; The SaatSaheli Team</p>
                </div>
                """;
        sendHtmlEmail(to, subject, body, "TEST", null, null, null);
    }

    /**
     * Single choke point for outbound mail. Every attempt — sent, failed, or skipped
     * because delivery is disabled — is recorded in email_log with the given kind
     * and optional link to the originating record (relatedType/relatedId/reference).
     */
    private void sendHtmlEmail(String to, String subject, String htmlBody,
                               String kind, String relatedType, Long relatedId, String reference) {
        String[] recipients;
        String finalSubject = subject;
        String redirect = redirectTo != null ? redirectTo.trim() : "";

        if (!redirect.isEmpty()) {
            // Dev catch-all: send to the test inboxes, stamp the real recipient.
            recipients = java.util.Arrays.stream(redirect.split(","))
                    .map(String::trim).filter(s -> !s.isEmpty()).toArray(String[]::new);
            finalSubject = "[DEV → " + to + "] " + subject;
        } else if (!emailEnabled) {
            log.info("Email delivery disabled (app.email.enabled=false) — skipping send to {} — subject: {}", to, subject);
            emailLogService.record(kind, to, null, subject, relatedType, relatedId, reference,
                    com.SaatSaheli.spring.model.EmailLog.STATUS_SKIPPED, "app.email.enabled=false");
            return;
        } else {
            recipients = new String[]{ to };
        }
        if (recipients.length == 0) return;
        String deliveredTo = String.join(",", recipients);

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "utf-8");
            helper.setFrom(fromAddress);
            helper.setTo(recipients);
            helper.setSubject(finalSubject);
            helper.setText(htmlBody, true);
            mailSender.send(mimeMessage);
            log.info("Email sent to {} — subject: {}", deliveredTo, finalSubject);
            emailLogService.record(kind, to, deliveredTo, subject, relatedType, relatedId, reference,
                    com.SaatSaheli.spring.model.EmailLog.STATUS_SENT, null);
        } catch (MessagingException | org.springframework.mail.MailException e) {
            log.error("Failed to send email to {} — {}", deliveredTo, e.getMessage());
            emailLogService.record(kind, to, deliveredTo, subject, relatedType, relatedId, reference,
                    com.SaatSaheli.spring.model.EmailLog.STATUS_FAILED, e.getMessage());
            throw new RuntimeException("Email delivery failed", e);
        }
    }
}
