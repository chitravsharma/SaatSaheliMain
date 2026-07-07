package com.SaatSaheli.spring.service;

import com.SaatSaheli.spring.model.MarketplaceListing;
import com.SaatSaheli.spring.model.MarketplaceOrder;
import com.SaatSaheli.spring.model.OrderItem;
import com.SaatSaheli.spring.model.PaymentTransaction;
import com.SaatSaheli.spring.repository.MarketplaceListingRepository;
import com.SaatSaheli.spring.repository.MarketplaceOrderRepository;
import com.SaatSaheli.spring.repository.PaymentTransactionRepository;
import com.SaatSaheli.spring.util.StripePaymentMapper;
import com.stripe.model.checkout.Session;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Random;

@Service
public class MarketplaceOrderService {

    private static final Logger log = LoggerFactory.getLogger(MarketplaceOrderService.class);
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final char[] HEX = "0123456789ABCDEF".toCharArray();
    private final Random random = new Random();

    @Autowired
    private MarketplaceOrderRepository orderRepo;

    @Autowired
    private MarketplaceListingRepository listingRepo;

    @Autowired
    private PaymentTransactionRepository txRepo;

    @Autowired
    private CartService cartService;

    @Autowired
    private EmailService emailService;

    /** Customer-facing confirmation number: SS-YYYYMMDD-XXXXXX (hex), unique. */
    public String generateOrderNumber() {
        String day = LocalDateTime.now().format(DAY);
        for (int attempt = 0; attempt < 12; attempt++) {
            StringBuilder sb = new StringBuilder("SS-").append(day).append("-");
            for (int i = 0; i < 6; i++) sb.append(HEX[random.nextInt(16)]);
            String candidate = sb.toString();
            if (!orderRepo.existsByOrderNumber(candidate)) return candidate;
        }
        // Extremely unlikely; fall back to a timestamp-suffixed value.
        return "SS-" + day + "-" + System.nanoTime();
    }

    public MarketplaceOrder save(MarketplaceOrder order) {
        return orderRepo.save(order);
    }

    /**
     * Fulfill a paid Checkout Session: flip the order to PAID, mark its listings SOLD,
     * clear the buyer's cart, record the payment ledger row, and email the receipt.
     *
     * Idempotent — the order's PAID status is the lock, so verify-session and the
     * webhook can both call this and only the first one does the work. `synchronized`
     * closes the small same-instance race (Render runs a single instance).
     */
    public synchronized MarketplaceOrder fulfillOrder(Session session, String eventId, String payload) {
        MarketplaceOrder order = orderRepo.findByStripeSessionId(session.getId()).orElse(null);
        if (order == null) {
            log.warn("Marketplace fulfillment: no order for session {}", session.getId());
            return null;
        }
        if (MarketplaceOrder.STATUS_PAID.equals(order.getStatus())
                || MarketplaceOrder.STATUS_SHIPPED.equals(order.getStatus())) {
            return order; // already fulfilled
        }
        if (!"paid".equalsIgnoreCase(session.getPaymentStatus())) {
            log.info("Marketplace fulfillment: session {} not paid yet ({})", session.getId(), session.getPaymentStatus());
            return order;
        }

        order.setStatus(MarketplaceOrder.STATUS_PAID);
        order.setPaidDate(LocalDateTime.now());
        order.setStripePaymentIntent(session.getPaymentIntent());
        orderRepo.save(order);

        // Mark each purchased listing SOLD so it leaves the active browse grid.
        for (OrderItem oi : order.getItems()) {
            if (oi.getListingId() == null) continue;
            listingRepo.findById(oi.getListingId()).ifPresent(listing -> {
                if (!"SOLD".equalsIgnoreCase(listing.getStatus())) {
                    listing.setStatus("SOLD");
                    listing.setModifiedDate(LocalDateTime.now());
                    listingRepo.save(listing);
                }
            });
        }

        // Empty the buyer's cart now that it's been bought.
        try { cartService.clearCart(order.getUserId()); } catch (Exception e) { log.warn("Could not clear cart for user {}", order.getUserId(), e); }

        // Payment audit ledger row (best-effort; never block fulfillment on it).
        try {
            PaymentTransaction tx = StripePaymentMapper.fromSession(
                    session, PaymentTransaction.TYPE_MARKETPLACE, order.getUserId(),
                    eventId != null ? eventId : "verify:" + session.getId(), payload);
            tx.setNotes("Marketplace order " + order.getOrderNumber());
            txRepo.save(tx);
        } catch (DataIntegrityViolationException dup) {
            log.info("Marketplace payment already recorded for session {}", session.getId());
        } catch (Exception e) {
            log.warn("Could not record marketplace payment ledger for session {}", session.getId(), e);
        }

        // Confirmation email (best-effort).
        try {
            if (order.getBuyerEmail() != null && !order.getBuyerEmail().isBlank()) {
                emailService.sendOrderConfirmation(order.getBuyerEmail(), order);
            }
        } catch (Exception e) {
            log.warn("Could not send order confirmation email for {}", order.getOrderNumber(), e);
        }

        log.info("Fulfilled marketplace order {} (session {})", order.getOrderNumber(), session.getId());
        return order;
    }
}
