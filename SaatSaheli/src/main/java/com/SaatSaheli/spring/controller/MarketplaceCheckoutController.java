package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.model.CartItem;
import com.SaatSaheli.spring.model.MarketplaceListing;
import com.SaatSaheli.spring.model.MarketplaceOrder;
import com.SaatSaheli.spring.model.OrderItem;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.MarketplaceOrderRepository;
import com.SaatSaheli.spring.repository.UserRepository;
import com.SaatSaheli.spring.service.CartService;
import com.SaatSaheli.spring.service.MarketplaceOrderService;
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
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Marketplace cart checkout via Stripe hosted Checkout. One-time PAYMENT session with
 * one line item per cart listing, priced dynamically via price_data (no pre-created
 * Price IDs). Mirrors {@code SupportController}. Requires a logged-in buyer.
 */
@RestController
@RequestMapping("/api/marketplace/checkout")
public class MarketplaceCheckoutController {

    private static final Logger log = LoggerFactory.getLogger(MarketplaceCheckoutController.class);
    private static final String PURPOSE = "marketplace_order";

    @Value("${stripe.secret-key:}")
    private String stripeSecretKey;

    @Value("${stripe.webhook-secret:}")
    private String stripeWebhookSecret;

    // Each Stripe webhook endpoint has its own signing secret. The marketplace
    // endpoint is separate from the support endpoint, so it needs its own secret.
    // Falls back to the shared secret when not configured (e.g. local/dev).
    @Value("${stripe.marketplace-webhook-secret:}")
    private String marketplaceWebhookSecret;

    // Flat delivery fee per currency (prices are tax-inclusive, so no tax line).
    @Value("${marketplace.shipping.inr:60}")
    private BigDecimal shippingInr;
    @Value("${marketplace.shipping.usd:8}")
    private BigDecimal shippingUsd;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    // ISO 3166-1 alpha-2 codes the shop ships to; buyers outside these can't check out.
    @Value("${marketplace.allowed-countries:IN,US,GB,CA,AU,AE,SG}")
    private String allowedCountriesCsv;

    @Autowired
    private CartService cartService;

    @Autowired
    private MarketplaceOrderService orderService;

    @Autowired
    private MarketplaceOrderRepository orderRepo;

    @Autowired
    private com.SaatSaheli.spring.repository.MarketplaceListingRepository listingRepo;

    @Autowired
    private UserRepository userRepo;

    @PostConstruct
    public void init() {
        if (stripeSecretKey != null && !stripeSecretKey.isEmpty()) {
            Stripe.apiKey = stripeSecretKey;
            log.info("Stripe configured for /api/marketplace/checkout");
        } else {
            log.warn("Stripe secret key not set — marketplace checkout returns 503");
        }
    }

    /** POST /api/marketplace/checkout/create-session → { url, sessionId, orderNumber } */
    @PostMapping("/create-session")
    public ResponseEntity<?> createSession(HttpServletRequest request) {
        Long userId = authUserId(request);
        if (userId == null) return unauthorized();
        if (stripeSecretKey == null || stripeSecretKey.isEmpty()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(error("Payments are not configured yet. Please try again later."));
        }

        User user = userRepo.findById(userId).orElse(null);
        if (user == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("User not found"));

        try {
            // Always price from the server-side cart — never trust client amounts.
            List<CartItem> cart = cartService.getCart(userId);
            List<MarketplaceListing> buyable = new ArrayList<>();
            for (CartItem it : cart) {
                MarketplaceListing l = it.getListing();
                if (l != null && "ACTIVE".equalsIgnoreCase(l.getStatus())
                        && l.getPriceAmount() != null && l.getCurrency() != null
                        && l.getQuantity() > 0) {
                    buyable.add(l);
                }
            }
            if (buyable.isEmpty()) {
                return ResponseEntity.badRequest().body(error("Your cart has no items available for purchase."));
            }

            String currency = buyable.get(0).getCurrency().toLowerCase();
            for (MarketplaceListing l : buyable) {
                if (!currency.equalsIgnoreCase(l.getCurrency())) {
                    return ResponseEntity.badRequest().body(error("All cart items must be the same currency."));
                }
            }

            SessionCreateParams.Builder params = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setCustomerEmail(user.getEmail())
                    .setSuccessUrl(frontendUrl + "/marketplace/order-confirmation?session_id={CHECKOUT_SESSION_ID}")
                    .setCancelUrl(frontendUrl + "/marketplace/cart")
                    .setShippingAddressCollection(buildShippingCollection())
                    .putMetadata("purpose", PURPOSE)
                    .putMetadata("userId", String.valueOf(userId));

            BigDecimal subtotal = BigDecimal.ZERO;
            List<OrderItem> orderItems = new ArrayList<>();
            for (MarketplaceListing l : buyable) {
                long unitAmount = l.getPriceAmount().movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
                params.addLineItem(
                        SessionCreateParams.LineItem.builder()
                                .setQuantity(1L)
                                .setPriceData(
                                        SessionCreateParams.LineItem.PriceData.builder()
                                                .setCurrency(currency)
                                                .setUnitAmount(unitAmount)
                                                .setProductData(
                                                        SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                                                .setName(l.getTitle())
                                                                .build())
                                                .build())
                                .build());
                subtotal = subtotal.add(l.getPriceAmount());
                orderItems.add(new OrderItem(l.getId(), l.getTitle(), l.getPriceAmount(),
                        currency, l.getUserId(), l.getImage1Url()));
            }

            // Delivery: sum each item's per-listing tier (magazines ship free).
            BigDecimal shipping = buyable.stream()
                    .map(this::perItemDelivery)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (shipping.signum() > 0) {
                params.addLineItem(deliveryLineItem(currency, shipping));
            }

            String orderNumber = orderService.generateOrderNumber();
            params.putMetadata("orderNumber", orderNumber);

            Session session = Session.create(params.build());

            // Supersede any earlier unpaid checkout this user left open, so we
            // don't pile up duplicate PENDING orders (one per checkout click).
            orderService.expirePendingOrders(userId, null);

            MarketplaceOrder order = new MarketplaceOrder();
            order.setOrderNumber(orderNumber);
            order.setUserId(userId);
            order.setBuyerEmail(user.getEmail());
            order.setBuyerName(buyerName(user));
            order.setSubtotal(subtotal);
            order.setShipping(shipping);
            order.setTotal(subtotal.add(shipping));
            order.setCurrency(currency);
            order.setStatus(MarketplaceOrder.STATUS_PENDING);
            order.setStripeSessionId(session.getId());
            order.setCreatedDate(LocalDateTime.now());
            order.setItems(orderItems);
            orderService.save(order);

            Map<String, Object> response = new HashMap<>();
            response.put("url", session.getUrl());
            response.put("sessionId", session.getId());
            response.put("orderNumber", orderNumber);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to create marketplace checkout session", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(error("Could not start checkout. Please try again."));
        }
    }

    /**
     * POST /api/marketplace/checkout/resume/{orderId} → { url }
     * "Proceed to payment" for a PENDING order: reuse the open Stripe session if
     * it's still valid, otherwise rebuild a fresh one from the order's items
     * (re-validating the listings are still available).
     */
    @PostMapping("/resume/{orderId}")
    public ResponseEntity<?> resume(@PathVariable Long orderId, HttpServletRequest request) {
        Long userId = authUserId(request);
        if (userId == null) return unauthorized();
        if (stripeSecretKey == null || stripeSecretKey.isEmpty()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(error("Payments not configured."));
        }
        MarketplaceOrder order = orderRepo.findById(orderId).orElse(null);
        if (order == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("Order not found."));
        if (!userId.equals(order.getUserId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error("This order isn't yours."));
        }
        if (!MarketplaceOrder.STATUS_PENDING.equals(order.getStatus())) {
            return ResponseEntity.badRequest().body(error("This order can no longer be paid."));
        }
        try {
            // Reuse the existing checkout session if Stripe still has it open.
            try {
                Session existing = Session.retrieve(order.getStripeSessionId());
                if (existing != null && "open".equalsIgnoreCase(existing.getStatus()) && existing.getUrl() != null) {
                    return ResponseEntity.ok(Map.of("url", existing.getUrl()));
                }
            } catch (Exception ignore) { /* expired/unknown — rebuild below */ }

            if (order.getItems() == null || order.getItems().isEmpty()) {
                return ResponseEntity.badRequest().body(error("This order has no items."));
            }
            SessionCreateParams.Builder params = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setCustomerEmail(order.getBuyerEmail())
                    .setSuccessUrl(frontendUrl + "/marketplace/order-confirmation?session_id={CHECKOUT_SESSION_ID}")
                    .setCancelUrl(frontendUrl + "/marketplace/orders")
                    .setShippingAddressCollection(buildShippingCollection())
                    .putMetadata("purpose", PURPOSE)
                    .putMetadata("userId", String.valueOf(userId))
                    .putMetadata("orderNumber", order.getOrderNumber());
            int added = 0;
            BigDecimal shipping = BigDecimal.ZERO;
            for (OrderItem oi : order.getItems()) {
                MarketplaceListing l = oi.getListingId() != null ? listingRepo.findById(oi.getListingId()).orElse(null) : null;
                if (l == null || !"ACTIVE".equalsIgnoreCase(l.getStatus()) || l.getPriceAmount() == null
                        || l.getCurrency() == null || l.getQuantity() <= 0) continue;
                shipping = shipping.add(perItemDelivery(l));
                long unitAmount = l.getPriceAmount().movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
                params.addLineItem(SessionCreateParams.LineItem.builder()
                        .setQuantity(1L)
                        .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                .setCurrency(l.getCurrency().toLowerCase())
                                .setUnitAmount(unitAmount)
                                .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                        .setName(l.getTitle()).build())
                                .build())
                        .build());
                added++;
            }
            if (added == 0) {
                return ResponseEntity.badRequest().body(error("The item(s) in this order are no longer available."));
            }
            if (shipping.signum() > 0) {
                params.addLineItem(deliveryLineItem(order.getCurrency(), shipping));
            }
            order.setShipping(shipping);
            order.setTotal((order.getSubtotal() != null ? order.getSubtotal() : BigDecimal.ZERO).add(shipping));
            Session session = Session.create(params.build());
            order.setStripeSessionId(session.getId());
            orderService.save(order);
            return ResponseEntity.ok(Map.of("url", session.getUrl()));
        } catch (Exception e) {
            log.error("Failed to resume marketplace order {}", orderId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error("Could not resume payment. Please try again."));
        }
    }

    /** GET /api/marketplace/checkout/verify-session?sessionId=cs_xxx → fulfilled order */
    @GetMapping("/verify-session")
    public ResponseEntity<?> verifySession(@RequestParam String sessionId, HttpServletRequest request) {
        Long userId = authUserId(request);
        if (userId == null) return unauthorized();
        if (stripeSecretKey == null || stripeSecretKey.isEmpty()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(error("Payments not configured."));
        }
        try {
            MarketplaceOrder order = orderRepo.findByStripeSessionId(sessionId).orElse(null);
            if (order == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("Order not found."));
            }
            if (!userId.equals(order.getUserId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error("This order isn't yours."));
            }

            Session session = Session.retrieve(sessionId);
            if ("paid".equalsIgnoreCase(session.getPaymentStatus())) {
                MarketplaceOrder fulfilled = orderService.fulfillOrder(session, null, null);
                return ResponseEntity.ok(fulfilled != null ? fulfilled : order);
            }
            // Not paid yet — return the pending order plus the raw status.
            Map<String, Object> resp = new HashMap<>();
            resp.put("order", order);
            resp.put("paymentStatus", session.getPaymentStatus());
            resp.put("status", session.getStatus());
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            log.error("Failed to verify marketplace session {}", sessionId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error("Could not verify session."));
        }
    }

    /** POST /api/marketplace/checkout/webhook — authoritative fulfillment backup. */
    @PostMapping("/webhook")
    public ResponseEntity<?> handleWebhook(@RequestBody String payload,
                                           @RequestHeader("Stripe-Signature") String sigHeader) {
        String secret = (marketplaceWebhookSecret != null && !marketplaceWebhookSecret.isBlank())
                ? marketplaceWebhookSecret : stripeWebhookSecret;
        if (secret == null || secret.isEmpty()) {
            log.warn("Marketplace webhook called but no signing secret is configured");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(error("Webhook not configured."));
        }
        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, secret);
        } catch (SignatureVerificationException e) {
            log.error("Marketplace webhook signature verification failed", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error("Invalid signature."));
        }
        try {
            String type = event.getType();
            if ("checkout.session.completed".equals(type)
                    || "checkout.session.async_payment_succeeded".equals(type)) {
                Session session = resolveSession(event);
                if (session != null) {
                    Map<String, String> md = session.getMetadata();
                    // Only our marketplace sessions carry this purpose; skip others
                    // (subscriptions/support are handled by their own controllers).
                    if (md != null && PURPOSE.equals(md.get("purpose"))) {
                        orderService.fulfillOrder(session, event.getId(), payload);
                    }
                }
            } else if ("checkout.session.expired".equals(type)) {
                // Stripe expired an abandoned session (~24h) — clean up its PENDING order.
                Session session = resolveSession(event);
                if (session != null) {
                    Map<String, String> md = session.getMetadata();
                    if (md != null && PURPOSE.equals(md.get("purpose"))) {
                        orderService.expireBySession(session.getId());
                    }
                }
            }
            return ResponseEntity.ok(Map.of("received", true));
        } catch (Exception e) {
            log.error("Marketplace webhook processing failed for event {}", event.getId(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error("Webhook error."));
        }
    }

    /** GET /api/marketplace/checkout/countries — the ISO codes the shop ships to (public). */
    @GetMapping("/countries")
    public ResponseEntity<?> allowedCountries() {
        return ResponseEntity.ok(Map.of("countries", parseAllowedCountries()));
    }

    /** GET /api/marketplace/checkout/fees — flat delivery fee per currency + tax note (public). */
    @GetMapping("/fees")
    public ResponseEntity<?> fees() {
        Map<String, Object> m = new HashMap<>();
        m.put("shipping", Map.of("inr", shippingInr, "usd", shippingUsd));
        m.put("taxIncluded", true);
        return ResponseEntity.ok(m);
    }

    private BigDecimal shippingFeeFor(String currency) {
        if ("inr".equalsIgnoreCase(currency)) return shippingInr != null ? shippingInr : BigDecimal.ZERO;
        if ("usd".equalsIgnoreCase(currency)) return shippingUsd != null ? shippingUsd : BigDecimal.ZERO;
        return BigDecimal.ZERO;
    }

    /** Per-listing delivery fee, in the listing's currency. Magazines ship free;
     *  a listing with no tier set yet counts as Free ($0). */
    private BigDecimal perItemDelivery(MarketplaceListing l) {
        if (l == null || "Magazine".equalsIgnoreCase(l.getCategory())) return BigDecimal.ZERO;
        return l.getDeliveryFee() != null ? l.getDeliveryFee() : BigDecimal.ZERO;
    }

    private SessionCreateParams.LineItem deliveryLineItem(String currency, BigDecimal shipping) {
        long minor = shipping.movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
        return SessionCreateParams.LineItem.builder()
                .setQuantity(1L)
                .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                        .setCurrency(currency.toLowerCase())
                        .setUnitAmount(minor)
                        .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                .setName("Delivery").build())
                        .build())
                .build();
    }

    private List<String> parseAllowedCountries() {
        List<String> out = new ArrayList<>();
        for (String c : allowedCountriesCsv.split(",")) {
            String code = c.trim().toUpperCase();
            if (!code.isEmpty()) out.add(code);
        }
        return out;
    }

    private SessionCreateParams.ShippingAddressCollection buildShippingCollection() {
        SessionCreateParams.ShippingAddressCollection.Builder b =
                SessionCreateParams.ShippingAddressCollection.builder();
        for (String code : parseAllowedCountries()) {
            try {
                b.addAllowedCountry(
                        SessionCreateParams.ShippingAddressCollection.AllowedCountry.valueOf(code));
            } catch (IllegalArgumentException ignored) {
                log.warn("Ignoring unknown allowed-country code: {}", code);
            }
        }
        return b.build();
    }

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
        if (!(obj instanceof Session)) return null;
        Session fromEvent = (Session) obj;
        try {
            return Session.retrieve(fromEvent.getId());
        } catch (StripeException e) {
            log.warn("Could not re-retrieve session {}; using event payload copy", fromEvent.getId(), e);
            return fromEvent;
        }
    }

    private String buyerName(User u) {
        if (u.getDisplayName() != null && !u.getDisplayName().isBlank()) return u.getDisplayName();
        String name = ((u.getFirstName() != null ? u.getFirstName() : "")
                + (u.getLastName() != null ? " " + u.getLastName() : "")).trim();
        return name.isEmpty() ? null : name;
    }

    private Long authUserId(HttpServletRequest request) {
        Object val = request.getAttribute("jwtUserId");
        return val instanceof Long ? (Long) val : null;
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error("Please log in to check out."));
    }

    private Map<String, String> error(String message) {
        Map<String, String> m = new HashMap<>();
        m.put("error", message);
        return m;
    }
}
