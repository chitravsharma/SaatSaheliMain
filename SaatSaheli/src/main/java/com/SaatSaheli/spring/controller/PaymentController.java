package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.model.PaymentTransaction;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.PaymentTransactionRepository;
import com.SaatSaheli.spring.repository.UserRepository;
import com.SaatSaheli.spring.util.StripePaymentMapper;
import com.stripe.Stripe;
import com.stripe.exception.EventDataObjectDeserializationException;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Charge;
import com.stripe.model.Dispute;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.StripeObject;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.ZoneOffset;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    @Value("${stripe.secret-key:}")
    private String stripeSecretKey;

    @Value("${stripe.webhook-secret:}")
    private String stripeWebhookSecret;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    // Stripe recurring Price IDs per plan. Injected from properties/env so they
    // resolve at runtime — a static Map of "${...}" literals would NOT be
    // interpolated by Spring (placeholders only resolve in @Value binding), which
    // previously made every checkout fail with "price not configured".
    @Value("${stripe.price.premium:}")
    private String pricePremium;

    @Value("${stripe.price.creator:}")
    private String priceCreator;

    @Value("${stripe.price.gold:}")
    private String priceGold;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private PaymentTransactionRepository txRepository;

    // Plan key → Stripe Price ID, resolved from the injected @Value fields at
    // startup. Only plans with a configured (non-blank) price are added, so an
    // unconfigured plan cleanly returns "not configured" instead of 500-ing.
    private final Map<String, String> planPriceIds = new HashMap<>();

    @PostConstruct
    public void init() {
        if (stripeSecretKey != null && !stripeSecretKey.isEmpty()) {
            Stripe.apiKey = stripeSecretKey;
            log.info("Stripe API configured");
        } else {
            log.warn("Stripe secret key not configured — payment endpoints will not work");
        }

        putIfConfigured("Premium", pricePremium);
        putIfConfigured("Creator", priceCreator);
        putIfConfigured("Gold", priceGold); // legacy tier, only if still configured
        log.info("Stripe subscription plans configured: {}", planPriceIds.keySet());
    }

    private void putIfConfigured(String plan, String priceId) {
        if (priceId != null && !priceId.isBlank() && !priceId.contains("placeholder")) {
            planPriceIds.put(plan, priceId.trim());
        }
    }

    /**
     * POST /api/payments/create-checkout-session
     * Body: { planKey, userId }
     * Creates a Stripe Checkout Session and returns the URL to redirect to.
     */
    @PostMapping("/create-checkout-session")
    public ResponseEntity<?> createCheckoutSession(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            if (stripeSecretKey == null || stripeSecretKey.isEmpty()) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body(errorMap("Payment processing is not configured yet. Please contact support."));
            }

            Long userId = body.get("userId") != null ? Long.parseLong(body.get("userId").toString()) : null;
            String planKey = (String) body.get("planKey");

            if (userId == null || planKey == null) {
                return ResponseEntity.badRequest().body(errorMap("userId and planKey are required"));
            }

            Optional<User> userOpt = userRepo.findById(userId);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap("User not found"));
            }

            String priceId = planPriceIds.get(planKey);
            if (priceId == null) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body(errorMap("Stripe price not configured for plan: " + planKey));
            }

            User user = userOpt.get();

            SessionCreateParams params = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                    .setCustomerEmail(user.getEmail())
                    .setSuccessUrl(frontendUrl + "/checkout-success?session_id={CHECKOUT_SESSION_ID}&plan=" + planKey)
                    .setCancelUrl(frontendUrl + "/pricing")
                    .addLineItem(
                            SessionCreateParams.LineItem.builder()
                                    .setPrice(priceId)
                                    .setQuantity(1L)
                                    .build()
                    )
                    .putMetadata("userId", String.valueOf(userId))
                    .putMetadata("planKey", planKey)
                    .build();

            Session session = Session.create(params);

            Map<String, Object> response = new HashMap<>();
            response.put("url", session.getUrl());
            response.put("sessionId", session.getId());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to create checkout session", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to create checkout session"));
        }
    }

    /**
     * POST /api/payments/webhook
     * Stripe webhook handler — verifies signature and processes events.
     */
    @PostMapping("/webhook")
    public ResponseEntity<?> handleWebhook(@RequestBody String payload, @RequestHeader("Stripe-Signature") String sigHeader) {
        try {
            // Never process an unverified event — a forged checkout.session.completed
            // could otherwise upgrade any user's plan for free. The signing secret is
            // mandatory; without it we cannot trust the payload.
            if (stripeWebhookSecret == null || stripeWebhookSecret.isEmpty()) {
                log.warn("Payments webhook called but stripe.webhook-secret is not configured");
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(errorMap("Webhook not configured."));
            }
            Event event = Webhook.constructEvent(payload, sigHeader, stripeWebhookSecret);

            switch (event.getType()) {
                case "checkout.session.completed" -> handleCheckoutCompleted(event, payload);
                case "charge.refunded" -> handleRefund(event);
                case "charge.dispute.created", "charge.dispute.updated", "charge.dispute.closed" -> handleDispute(event);
                default -> { /* event type not handled */ }
            }

            return ResponseEntity.ok(Map.of("received", true));

        } catch (SignatureVerificationException e) {
            log.error("Webhook signature verification failed", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorMap("Invalid signature"));
        } catch (Exception e) {
            log.error("Webhook processing failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorMap("Webhook error"));
        }
    }

    /**
     * GET /api/payments/verify-session?sessionId=xxx
     * Verify a completed checkout session and return the plan.
     */
    @GetMapping("/verify-session")
    public ResponseEntity<?> verifySession(@RequestParam String sessionId) {
        try {
            if (stripeSecretKey == null || stripeSecretKey.isEmpty()) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body(errorMap("Payment processing not configured"));
            }

            Session session = Session.retrieve(sessionId);
            if ("complete".equals(session.getStatus())) {
                String planKey = session.getMetadata().get("planKey");
                String userIdStr = session.getMetadata().get("userId");
                Map<String, Object> response = new HashMap<>();
                response.put("status", "complete");
                response.put("planKey", planKey);
                response.put("userId", userIdStr);
                return ResponseEntity.ok(response);
            }

            return ResponseEntity.ok(Map.of("status", session.getStatus()));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to verify session"));
        }
    }

    /**
     * Pulls the Checkout Session out of a webhook event, tolerant of an API-version
     * mismatch between the account's events and the stripe-java SDK. When the safe
     * deserializer returns empty (version skew), force-deserialize to read the id,
     * then re-fetch via Session.retrieve so all fields are in the SDK's own version.
     */
    private StripeObject resolveObject(Event event) {
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
        return obj;
    }

    private Session resolveSession(Event event) {
        StripeObject obj = resolveObject(event);
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

    private void handleCheckoutCompleted(Event event, String payload) {
        Session session = resolveSession(event);
        if (session == null) {
            log.warn("Payments webhook: could not resolve Checkout Session from event {}", event.getId());
            return;
        }
        Map<String, String> md = session.getMetadata();
        String planKey = md != null ? md.get("planKey") : null;
        // Only plan/subscription sessions carry planKey. Sessions without it (support /
        // sponsor) belong to SupportController — skip so we don't mis-handle them here.
        if (planKey == null) {
            log.info("Payments webhook: session {} has no planKey; skipping", session.getId());
            return;
        }

        String userIdStr = md.get("userId");
        Long userId = userIdStr != null ? Long.parseLong(userIdStr) : null;
        if (userId != null) {
            userRepo.findById(userId).ifPresent(user -> {
                user.setPlan(planKey);
                user.setModifiedDate(LocalDateTime.now());
                userRepo.save(user);
                log.info("User {} upgraded to plan {}", userId, planKey);
            });
        }

        if (txRepository.findByWebhookEventId(event.getId()).isPresent()) {
            return;
        }
        PaymentTransaction tx = StripePaymentMapper.fromSession(
                session, PaymentTransaction.TYPE_SUBSCRIPTION, userId, event.getId(), payload);
        try {
            txRepository.save(tx);
            log.info("Recorded subscription payment: ref={} session={} amount={} {}",
                    tx.getPaymentReferenceId(), session.getId(), tx.getAmount(), tx.getCurrency());
        } catch (DataIntegrityViolationException dup) {
            log.info("Subscription payment already recorded for event {}", event.getId());
        }
    }

    private void handleRefund(Event event) {
        StripeObject obj = resolveObject(event);
        if (!(obj instanceof Charge)) {
            return;
        }
        Charge charge = (Charge) obj;
        String pi = charge.getPaymentIntent();
        if (pi == null) {
            return;
        }
        txRepository.findByProviderPaymentId(pi).ifPresent(tx -> {
            boolean partial = charge.getAmountRefunded() != null && charge.getAmount() != null
                    && charge.getAmountRefunded() < charge.getAmount();
            tx.setRefundStatus(partial ? "Partial Refund" : "Refunded");
            tx.setPaymentStatus("Refunded");
            tx.setUpdatedAt(LocalDateTime.now(ZoneOffset.UTC));
            tx.setUpdatedBy("stripe-webhook");
            txRepository.save(tx);
            log.info("Recorded refund on payment {} (pi={})", tx.getPaymentReferenceId(), pi);
        });
    }

    private void handleDispute(Event event) {
        StripeObject obj = resolveObject(event);
        if (!(obj instanceof Dispute)) {
            return;
        }
        Dispute dispute = (Dispute) obj;
        String pi = dispute.getPaymentIntent();
        if (pi == null) {
            return;
        }
        txRepository.findByProviderPaymentId(pi).ifPresent(tx -> {
            String reason = dispute.getReason() != null ? dispute.getReason() : "dispute";
            tx.setDisputeStatus(reason + " / " + dispute.getStatus());
            tx.setUpdatedAt(LocalDateTime.now(ZoneOffset.UTC));
            tx.setUpdatedBy("stripe-webhook");
            txRepository.save(tx);
            log.info("Recorded dispute on payment {} (pi={}, status={})",
                    tx.getPaymentReferenceId(), pi, dispute.getStatus());
        });
    }

    private Map<String, String> errorMap(String message) {
        Map<String, String> map = new HashMap<>();
        map.put("error", message);
        return map;
    }
}
