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

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Autowired
    private JavaMailSender mailSender;

    @Value("${mail.from:avikaventures.info@gmail.com}")
    private String fromAddress;

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

        sendHtmlEmail(toEmail, subject, body);
    }

    /**
     * Send a notification when a contact form is submitted.
     */
    public void sendContactNotification(String senderName, String senderEmail, String msgSubject, String message) {
        String subject = "SaatSaheli — New Contact Form Message from " + senderName;
        String body = """
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
                  <h2 style="color: #2563eb;">New Contact Form Submission</h2>
                  <table style="width: 100%%; border-collapse: collapse; margin: 16px 0;">
                    <tr><td style="padding: 8px 0; color: #6b7280; width: 80px;"><strong>From:</strong></td><td>%s</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;"><strong>Email:</strong></td><td><a href="mailto:%s">%s</a></td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;"><strong>Subject:</strong></td><td>%s</td></tr>
                  </table>
                  <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 16px 0; white-space: pre-wrap;">%s</div>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                  <p style="color: #9ca3af; font-size: 0.85rem;">Reply directly to the sender at <a href="mailto:%s">%s</a></p>
                </div>
                """.formatted(senderName, senderEmail, senderEmail, msgSubject, message, senderEmail, senderEmail);

        sendHtmlEmail(fromAddress, subject, body);
    }

    private void sendHtmlEmail(String to, String subject, String htmlBody) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "utf-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(mimeMessage);
            log.info("Email sent to {} — subject: {}", to, subject);
        } catch (MessagingException e) {
            log.error("Failed to send email to {} — {}", to, e.getMessage());
        }
    }
}
