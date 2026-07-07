package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.model.MarketplaceOrder;
import com.SaatSaheli.spring.repository.MarketplaceOrderRepository;
import com.SaatSaheli.spring.service.MarketplaceOrderService;
import com.stripe.Stripe;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Buyer-facing "My Orders": list, detail, and cancellation. Login required; every
 * order is ownership-checked against the JWT user.
 */
@RestController
@RequestMapping("/api/marketplace/orders")
public class MarketplaceOrderController {

    private static final Logger log = LoggerFactory.getLogger(MarketplaceOrderController.class);

    @Value("${stripe.secret-key:}")
    private String stripeSecretKey;

    @Autowired
    private MarketplaceOrderRepository orderRepo;

    @Autowired
    private MarketplaceOrderService orderService;

    @PostConstruct
    public void init() {
        if (stripeSecretKey != null && !stripeSecretKey.isEmpty()) {
            Stripe.apiKey = stripeSecretKey;
        }
    }

    /** GET /api/marketplace/orders — the logged-in buyer's orders (newest first). */
    @GetMapping
    public ResponseEntity<?> myOrders(HttpServletRequest request) {
        Long userId = authUserId(request);
        if (userId == null) return unauthorized();
        List<MarketplaceOrder> orders = orderRepo.findByUserIdOrderByCreatedDateDesc(userId);
        orders.forEach(this::annotateCancellable);
        return ResponseEntity.ok(orders);
    }

    /** GET /api/marketplace/orders/{id} — one order (must belong to the caller). */
    @GetMapping("/{id}")
    public ResponseEntity<?> getOrder(@PathVariable Long id, HttpServletRequest request) {
        Long userId = authUserId(request);
        if (userId == null) return unauthorized();
        Optional<MarketplaceOrder> opt = orderRepo.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap("Order not found"));
        MarketplaceOrder order = opt.get();
        if (!userId.equals(order.getUserId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("This order isn't yours"));
        }
        annotateCancellable(order);
        return ResponseEntity.ok(order);
    }

    /** POST /api/marketplace/orders/{id}/cancel — cancel + auto-refund if eligible. */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelOrder(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body,
                                         HttpServletRequest request) {
        Long userId = authUserId(request);
        if (userId == null) return unauthorized();
        Optional<MarketplaceOrder> opt = orderRepo.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap("Order not found"));
        MarketplaceOrder order = opt.get();
        if (!userId.equals(order.getUserId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("This order isn't yours"));
        }
        String reason = body != null ? body.get("reason") : null;
        try {
            MarketplaceOrder cancelled = orderService.cancelOrder(order, reason);
            annotateCancellable(cancelled);
            return ResponseEntity.ok(cancelled);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(errorMap(e.getMessage()));
        } catch (Exception e) {
            log.error("Cancel failed for order {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap(e.getMessage() != null ? e.getMessage() : "Cancellation failed"));
        }
    }

    private void annotateCancellable(MarketplaceOrder order) {
        MarketplaceOrderService.CancelCheck check = orderService.canCancel(order);
        order.setCancellable(check.cancellable());
        order.setCancelBlockedReason(check.reason());
    }

    private Long authUserId(HttpServletRequest request) {
        Object val = request.getAttribute("jwtUserId");
        return val instanceof Long ? (Long) val : null;
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorMap("Please log in to view your orders"));
    }

    private Map<String, String> errorMap(String message) {
        Map<String, String> map = new HashMap<>();
        map.put("error", message);
        return map;
    }
}
