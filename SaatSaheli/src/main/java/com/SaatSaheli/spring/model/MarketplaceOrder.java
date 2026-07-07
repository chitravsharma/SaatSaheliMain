package com.SaatSaheli.spring.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * A marketplace purchase. Created PENDING when a buyer starts Stripe Checkout and
 * flipped to PAID by the webhook / verify-session fulfillment. `orderNumber` is the
 * customer-facing confirmation number.
 */
@Entity
@Table(name = "marketplace_orders")
public class MarketplaceOrder {

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_PAID = "PAID";
    public static final String STATUS_SHIPPED = "SHIPPED";
    public static final String STATUS_CANCELLED = "CANCELLED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Customer-facing confirmation number, e.g. SS-20260707-4F9C2A.
    @Column(name = "order_number", nullable = false, unique = true)
    private String orderNumber;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "buyer_email")
    private String buyerEmail;

    @Column(name = "buyer_name")
    private String buyerName;

    @Column(precision = 12, scale = 2)
    private BigDecimal subtotal;

    private String currency;

    private String status;

    @Column(name = "stripe_session_id", unique = true)
    private String stripeSessionId;

    @Column(name = "stripe_payment_intent")
    private String stripePaymentIntent;

    @Column(name = "tracking_number")
    private String trackingNumber;

    @Column(name = "tracking_carrier")
    private String trackingCarrier;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "created_date")
    private LocalDateTime createdDate;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "paid_date")
    private LocalDateTime paidDate;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JoinColumn(name = "order_id")
    private List<OrderItem> items = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getBuyerEmail() { return buyerEmail; }
    public void setBuyerEmail(String buyerEmail) { this.buyerEmail = buyerEmail; }

    public String getBuyerName() { return buyerName; }
    public void setBuyerName(String buyerName) { this.buyerName = buyerName; }

    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getStripeSessionId() { return stripeSessionId; }
    public void setStripeSessionId(String stripeSessionId) { this.stripeSessionId = stripeSessionId; }

    public String getStripePaymentIntent() { return stripePaymentIntent; }
    public void setStripePaymentIntent(String stripePaymentIntent) { this.stripePaymentIntent = stripePaymentIntent; }

    public String getTrackingNumber() { return trackingNumber; }
    public void setTrackingNumber(String trackingNumber) { this.trackingNumber = trackingNumber; }

    public String getTrackingCarrier() { return trackingCarrier; }
    public void setTrackingCarrier(String trackingCarrier) { this.trackingCarrier = trackingCarrier; }

    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }

    public LocalDateTime getPaidDate() { return paidDate; }
    public void setPaidDate(LocalDateTime paidDate) { this.paidDate = paidDate; }

    public List<OrderItem> getItems() { return items; }
    public void setItems(List<OrderItem> items) { this.items = items; }
}
