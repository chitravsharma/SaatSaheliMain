package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.model.PaymentTransaction;
import com.SaatSaheli.spring.repository.PaymentTransactionRepository;
import com.SaatSaheli.spring.util.StripePaymentMapper;
import com.stripe.Stripe;
import com.stripe.exception.EventDataObjectDeserializationException;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.StripeObject;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Stripe Checkout for one-off / recurring supporter contributions and sponsor
 * package payments. Hosted Checkout (redirect) — no card data touches our server.
 * Amounts are passed dynamically via price_data so no pre-created Price IDs are
 * needed. Open to anonymous visitors (no auth required to support the site).
 */
@RestController
@RequestMapping("/api/support")
public class SupportController {

    private static final Logger log = LoggerFactory.getLogger(SupportController.class);

    private static final Set<String> ALLOWED_CURRENCIES = Set.of("inr", "usd");

    // Min/max in MAJOR units, per currency, to reject typos and abuse.
    private static final Map<String, BigDecimal> MIN_AMOUNT = Map.of("inr", new BigDecimal("50"), "usd", new BigDecimal("1"));
    private static final Map<String, BigDecimal> MAX_AMOUNT = Map.of("inr", new BigDecimal("500000"), "usd", new BigDecimal("10000"));

    @Value("${stripe.secret-key:}")
    private String stripeSecretKey;

    @Value("${stripe.webhook-secret:}")
    private String stripeWebhookSecret;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Autowired
    private PaymentTransactionRepository txRepository;

    @PostConstruct
    public void init() {
        if (stripeSecretKey != null && !stripeSecretKey.isEmpty()) {
            Stripe.apiKey = stripeSecretKey;
            log.info("Stripe configured for /api/support");
        } else {
            log.warn("Stripe secret key not set — /api/support endpoints will return 503");
        }
    }

    /**
     * POST /api/support/create-checkout-session
     * Body: { amount, currency(inr|usd), frequency(one_time|monthly|annual),
     *         purpose(donation|sponsor), label?, name?, email?, message? }
     * Returns: { url, sessionId }
     */
    @PostMapping("/create-checkout-session")
    public ResponseEntity<?> createCheckoutSession(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        if (stripeSecretKey == null || stripeSecretKey.isEmpty()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(error("Payments are not configured yet. Please try again later."));
        }

        try {
            String currency = str(body.get("currency"), "inr").toLowerCase();
            if (!ALLOWED_CURRENCIES.contains(currency)) {
                return ResponseEntity.badRequest().body(error("Unsupported currency. Use INR or USD."));
            }

            String frequency = str(body.get("frequency"), "one_time").toLowerCase();
            if (!Set.of("one_time", "monthly", "annual").contains(frequency)) {
                return ResponseEntity.badRequest().body(error("Invalid frequency."));
            }

            if (body.get("amount") == null) {
                return ResponseEntity.badRequest().body(error("Amount is required."));
            }
            BigDecimal amount;
            try {
                amount = new BigDecimal(body.get("amount").toString().trim());
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body(error("Amount must be a number."));
            }
            if (amount.compareTo(MIN_AMOUNT.get(currency)) < 0 || amount.compareTo(MAX_AMOUNT.get(currency)) > 0) {
                return ResponseEntity.badRequest().body(error(
                        "Amount must be between " + MIN_AMOUNT.get(currency) + " and " + MAX_AMOUNT.get(currency)
                                + " " + currency.toUpperCase() + "."));
            }
            long unitAmount = amount.movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();

            String purpose = str(body.get("purpose"), "donation").toLowerCase();
            boolean recurring = !"one_time".equals(frequency);
            String label = str(body.get("label"), "");
            if (label.isEmpty()) {
                label = "sponsor".equals(purpose) ? "SaatSaheli Sponsorship" : "Support SaatSaheli";
            }
            String email = str(body.get("email"), "");
            String name = str(body.get("name"), "");
            String message = str(body.get("message"), "");

            SessionCreateParams.LineItem.PriceData.Builder priceData =
                    SessionCreateParams.LineItem.PriceData.builder()
                            .setCurrency(currency)
                            .setUnitAmount(unitAmount)
                            .setProductData(
                                    SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                            .setName(label)
                                            .build());

            if (recurring) {
                SessionCreateParams.LineItem.PriceData.Recurring.Interval interval =
                        "annual".equals(frequency)
                                ? SessionCreateParams.LineItem.PriceData.Recurring.Interval.YEAR
                                : SessionCreateParams.LineItem.PriceData.Recurring.Interval.MONTH;
                priceData.setRecurring(
                        SessionCreateParams.LineItem.PriceData.Recurring.builder()
                                .setInterval(interval)
                                .build());
            }

            String cancelPath = str(body.get("cancelPath"), "/support");
            if (!cancelPath.startsWith("/")) cancelPath = "/" + cancelPath;

            SessionCreateParams.Builder params = SessionCreateParams.builder()
                    .setMode(recurring ? SessionCreateParams.Mode.SUBSCRIPTION : SessionCreateParams.Mode.PAYMENT)
                    .setSuccessUrl(frontendUrl + "/support/thank-you?session_id={CHECKOUT_SESSION_ID}")
                    .setCancelUrl(frontendUrl + cancelPath)
                    .addLineItem(
                            SessionCreateParams.LineItem.builder()
                                    .setPriceData(priceData.build())
                                    .setQuantity(1L)
                                    .build())
                    .putMetadata("purpose", purpose)
                    .putMetadata("frequency", frequency)
                    .putMetadata("label", label);

            if (!email.isEmpty()) params.setCustomerEmail(email);
            if (!name.isEmpty()) params.putMetadata("supporterName", truncate(name, 480));
            if (!message.isEmpty()) params.putMetadata("message", truncate(message, 480));

            // Captured for the payment audit row (read back in the webhook via metadata).
            String ip = clientIp(request);
            if (ip != null) params.putMetadata("ip", truncate(ip, 64));
            String ua = request.getHeader("User-Agent");
            if (ua != null && !ua.isBlank()) params.putMetadata("ua", truncate(ua, 480));

            Session session = Session.create(params.build());

            Map<String, Object> response = new HashMap<>();
            response.put("url", session.getUrl());
            response.put("sessionId", session.getId());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to create support checkout session", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(error("Could not start checkout. Please try again."));
        }
    }

    /**
     * GET /api/support/verify-session?sessionId=cs_xxx
     * Used by the thank-you page to confirm a completed contribution.
     */
    @GetMapping("/verify-session")
    public ResponseEntity<?> verifySession(@RequestParam String sessionId) {
        if (stripeSecretKey == null || stripeSecretKey.isEmpty()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(error("Payments not configured."));
        }
        try {
            Session session = Session.retrieve(sessionId);
            Map<String, Object> response = new HashMap<>();
            response.put("status", session.getStatus());
            response.put("paymentStatus", session.getPaymentStatus());
            response.put("mode", session.getMode());
            if (session.getAmountTotal() != null) {
                response.put("amount", BigDecimal.valueOf(session.getAmountTotal()).movePointLeft(2));
            }
            response.put("currency", session.getCurrency());
            if (session.getMetadata() != null) {
                response.put("frequency", session.getMetadata().get("frequency"));
                response.put("label", session.getMetadata().get("label"));
                response.put("purpose", session.getMetadata().get("purpose"));
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to verify support session {}", sessionId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error("Could not verify session."));
        }
    }

    /**
     * POST /api/support/webhook
     * Stripe webhook — the authoritative record of a completed contribution.
     * verify-session only renders the thank-you page; this persists the donation
     * even if the supporter closes the tab before the redirect. Idempotent on the
     * Stripe session id, so repeated/duplicate deliveries do not double-record.
     */
    @PostMapping("/webhook")
    public ResponseEntity<?> handleWebhook(@RequestBody String payload,
                                           @RequestHeader("Stripe-Signature") String sigHeader) {
        if (stripeWebhookSecret == null || stripeWebhookSecret.isEmpty()) {
            log.warn("Support webhook called but stripe.webhook-secret is not configured");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(error("Webhook not configured."));
        }

        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, stripeWebhookSecret);
        } catch (SignatureVerificationException e) {
            log.error("Support webhook signature verification failed", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error("Invalid signature."));
        }

        try {
            String type = event.getType();
            if ("checkout.session.completed".equals(type)
                    || "checkout.session.async_payment_succeeded".equals(type)) {
                Session session = resolveSession(event);
                if (session != null) {
                    recordTransaction(session, event.getId(), payload);
                } else {
                    log.warn("Support webhook {}: could not resolve Checkout Session from event {}",
                            type, event.getId());
                }
            }
            return ResponseEntity.ok(Map.of("received", true));
        } catch (Exception e) {
            log.error("Support webhook processing failed for event {}", event.getId(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error("Webhook error."));
        }
    }

    /**
     * Pulls the Checkout Session out of a webhook event, tolerant of an API-version
     * mismatch between the account's events and the stripe-java SDK. When the safe
     * deserializer returns empty (version skew), force-deserialize to read the id,
     * then re-fetch via Session.retrieve so all fields are in the SDK's own version.
     */
    private Session resolveSession(Event event) {
        EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();
        StripeObject obj = deserializer.getObject().orElse(null);
        if (obj == null) {
            try {
                obj = deserializer.deserializeUnsafe();
            } catch (EventDataObjectDeserializationException e) {
                log.warn("Could not deserialize data object for event {}", event.getId(), e);
                return null;
            }
        }
        if (!(obj instanceof Session)) {
            return null;
        }
        Session fromEvent = (Session) obj;
        try {
            return Session.retrieve(fromEvent.getId());
        } catch (StripeException e) {
            log.warn("Could not re-retrieve session {}; using event payload copy", fromEvent.getId(), e);
            return fromEvent;
        }
    }

    private void recordTransaction(Session session, String eventId, String payload) {
        if (txRepository.findByWebhookEventId(eventId).isPresent()) {
            log.info("Transaction already recorded for event {}", eventId);
            return;
        }

        Map<String, String> md = session.getMetadata();
        String purpose = md != null ? md.get("purpose") : null;
        // Only sessions minted by the support flow carry a "purpose". A session without
        // one (e.g. a plan subscription handled by PaymentController) isn't ours to
        // record here — skip it so it can't be miscategorised as support.
        if (purpose == null || purpose.isBlank()) {
            log.info("Support webhook: session {} has no purpose metadata; skipping", session.getId());
            return;
        }
        // A sponsor checkout is a sponsorship; everything else from the support flow
        // is a community contribution.
        String paymentType = "sponsor".equalsIgnoreCase(purpose)
                ? PaymentTransaction.TYPE_SPONSOR
                : PaymentTransaction.TYPE_SUPPORT;

        PaymentTransaction tx = StripePaymentMapper.fromSession(session, paymentType, null, eventId, payload);
        if (md != null && md.get("message") != null) {
            tx.setNotes(md.get("message"));
        }

        try {
            txRepository.save(tx);
            log.info("Recorded {} payment: ref={} session={} amount={} {}",
                    paymentType, tx.getPaymentReferenceId(), session.getId(), tx.getAmount(), tx.getCurrency());
        } catch (DataIntegrityViolationException dup) {
            // Concurrent delivery beat us to the unique webhook_event_id; treat as success.
            log.info("Transaction already recorded (concurrent delivery) for event {}", eventId);
        }
    }

    private static String clientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private static String str(Object o, String dflt) {
        return o == null ? dflt : o.toString().trim();
    }

    private static String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max);
    }

    private static Map<String, String> error(String message) {
        Map<String, String> m = new HashMap<>();
        m.put("error", message);
        return m;
    }
}
