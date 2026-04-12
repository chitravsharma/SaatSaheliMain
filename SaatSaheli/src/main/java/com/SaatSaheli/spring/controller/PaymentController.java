package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.UserRepository;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
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

    @Autowired
    private UserRepository userRepo;

    // Plan key → Stripe Price ID mapping (set these after creating products in Stripe Dashboard)
    private static final Map<String, String> PLAN_PRICE_IDS = Map.of(
            "Premium", "${STRIPE_PRICE_PREMIUM:price_premium_placeholder}",
            "Gold", "${STRIPE_PRICE_GOLD:price_gold_placeholder}",
            "Creator", "${STRIPE_PRICE_CREATOR:price_creator_placeholder}"
    );

    @PostConstruct
    public void init() {
        if (stripeSecretKey != null && !stripeSecretKey.isEmpty()) {
            Stripe.apiKey = stripeSecretKey;
            log.info("Stripe API configured");
        } else {
            log.warn("Stripe secret key not configured — payment endpoints will not work");
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

            String priceId = PLAN_PRICE_IDS.get(planKey);
            if (priceId == null || priceId.contains("placeholder")) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body(errorMap("Stripe price not configured for plan: " + planKey));
            }

            User user = userOpt.get();

            SessionCreateParams params = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                    .setCustomerEmail(user.getEmail())
                    .setSuccessUrl(frontendUrl + "/#/checkout-success?session_id={CHECKOUT_SESSION_ID}&plan=" + planKey)
                    .setCancelUrl(frontendUrl + "/#/pricing")
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
            Event event;
            if (stripeWebhookSecret != null && !stripeWebhookSecret.isEmpty()) {
                event = Webhook.constructEvent(payload, sigHeader, stripeWebhookSecret);
            } else {
                log.warn("Webhook secret not configured — skipping signature verification");
                event = Event.GSON.fromJson(payload, Event.class);
            }

            if ("checkout.session.completed".equals(event.getType())) {
                Session session = (Session) event.getDataObjectDeserializer().getObject().orElse(null);
                if (session != null) {
                    String userIdStr = session.getMetadata().get("userId");
                    String planKey = session.getMetadata().get("planKey");

                    if (userIdStr != null && planKey != null) {
                        Long userId = Long.parseLong(userIdStr);
                        Optional<User> userOpt = userRepo.findById(userId);
                        if (userOpt.isPresent()) {
                            User user = userOpt.get();
                            user.setPlan(planKey);
                            user.setModifiedDate(LocalDateTime.now());
                            userRepo.save(user);
                            log.info("User {} upgraded to plan {}", userId, planKey);
                        }
                    }
                }
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

    private Map<String, String> errorMap(String message) {
        Map<String, String> map = new HashMap<>();
        map.put("error", message);
        return map;
    }
}
