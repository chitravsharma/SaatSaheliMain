package com.SaatSaheli.spring.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Platform-wide payment audit/report ledger — one row per payment. Populated from
 * provider webhooks (Stripe today; Razorpay/PayPal later). Refunds and disputes are
 * recorded as status updates on the originating payment row, not as new rows.
 * {@code webhookEventId} is unique so a redelivered webhook never double-inserts.
 */
@Entity
@Table(name = "payment_transactions")
public class PaymentTransaction {

    public static final String PROVIDER_STRIPE = "stripe";

    // payment_type values
    public static final String TYPE_SUPPORT = "support";
    public static final String TYPE_SPONSOR = "sponsor";
    public static final String TYPE_SUBSCRIPTION = "subscription";
    public static final String TYPE_PAYMENT = "payment";
    public static final String TYPE_REFUND = "refund";
    public static final String TYPE_BOOK_PURCHASE = "book_purchase";
    public static final String TYPE_MAGAZINE = "magazine";
    public static final String TYPE_OTHER = "other";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Unique human-friendly internal reference, e.g. PAY-2026-0001A2.
    @Column(name = "payment_reference_id", length = 64, unique = true)
    private String paymentReferenceId;

    @Column(name = "provider", length = 32)
    private String provider;

    // Provider's payment id (Stripe PaymentIntent id, etc.).
    @Column(name = "provider_payment_id", length = 255)
    private String providerPaymentId;

    @Column(name = "provider_customer_id", length = 255)
    private String providerCustomerId;

    // Our platform user/customer id (null for anonymous supporters).
    @Column(name = "user_id")
    private Long userId;

    // Related order / subscription / donation id (e.g. the Checkout Session id).
    @Column(name = "order_id", length = 255)
    private String orderId;

    // Donation / Subscription / Book Purchase / Magazine / Sponsor / Other.
    @Column(name = "payment_type", length = 32)
    private String paymentType;

    @Column(name = "amount", precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency", length = 8)
    private String currency;

    @Column(name = "platform_fee", precision = 12, scale = 2)
    private BigDecimal platformFee;

    @Column(name = "gateway_fee", precision = 12, scale = 2)
    private BigDecimal gatewayFee;

    @Column(name = "tax_amount", precision = 12, scale = 2)
    private BigDecimal taxAmount;

    @Column(name = "net_amount", precision = 12, scale = 2)
    private BigDecimal netAmount;

    // Pending / Paid / Failed / Refunded.
    @Column(name = "payment_status", length = 32)
    private String paymentStatus;

    // Refunded / Partial Refund (null when not refunded).
    @Column(name = "refund_status", length = 32)
    private String refundStatus;

    // Chargeback / dispute state + reason (null when no dispute).
    @Column(name = "dispute_status", length = 64)
    private String disputeStatus;

    // Card / ACH / Wallet / UPI etc.
    @Column(name = "payment_method", length = 32)
    private String paymentMethod;

    @Column(name = "card_brand", length = 32)
    private String cardBrand;

    @Column(name = "last4", length = 4)
    private String last4;

    @Column(name = "receipt_url", length = 512)
    private String receiptUrl;

    @Column(name = "invoice_url", length = 512)
    private String invoiceUrl;

    @Column(name = "payer_name")
    private String payerName;

    @Column(name = "payer_email")
    private String payerEmail;

    @Column(name = "billing_country", length = 8)
    private String billingCountry;

    // Captured at checkout-creation time for audit/security.
    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    // Provider risk indicator (e.g. Stripe Radar risk_level: normal/elevated/highest).
    @Column(name = "fraud_score", length = 32)
    private String fraudScore;

    // Provider webhook event id — unique to make ingestion idempotent.
    @Column(name = "webhook_event_id", length = 255, unique = true)
    private String webhookEventId;

    @Column(name = "webhook_payload", columnDefinition = "TEXT")
    private String webhookPayload;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    // Stored in UTC. The 'Z' literal marks the serialized string as UTC.
    @Column(name = "created_at")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'", timezone = "UTC")
    private LocalDateTime createdAt;

    @Column(name = "paid_at")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'", timezone = "UTC")
    private LocalDateTime paidAt;

    @Column(name = "updated_at")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'", timezone = "UTC")
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 64)
    private String createdBy;

    @Column(name = "updated_by", length = 64)
    private String updatedBy;

    @Column(name = "deleted_flag", nullable = false)
    private boolean deletedFlag = false;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPaymentReferenceId() { return paymentReferenceId; }
    public void setPaymentReferenceId(String paymentReferenceId) { this.paymentReferenceId = paymentReferenceId; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getProviderPaymentId() { return providerPaymentId; }
    public void setProviderPaymentId(String providerPaymentId) { this.providerPaymentId = providerPaymentId; }

    public String getProviderCustomerId() { return providerCustomerId; }
    public void setProviderCustomerId(String providerCustomerId) { this.providerCustomerId = providerCustomerId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public String getPaymentType() { return paymentType; }
    public void setPaymentType(String paymentType) { this.paymentType = paymentType; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public BigDecimal getPlatformFee() { return platformFee; }
    public void setPlatformFee(BigDecimal platformFee) { this.platformFee = platformFee; }

    public BigDecimal getGatewayFee() { return gatewayFee; }
    public void setGatewayFee(BigDecimal gatewayFee) { this.gatewayFee = gatewayFee; }

    public BigDecimal getTaxAmount() { return taxAmount; }
    public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }

    public BigDecimal getNetAmount() { return netAmount; }
    public void setNetAmount(BigDecimal netAmount) { this.netAmount = netAmount; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getRefundStatus() { return refundStatus; }
    public void setRefundStatus(String refundStatus) { this.refundStatus = refundStatus; }

    public String getDisputeStatus() { return disputeStatus; }
    public void setDisputeStatus(String disputeStatus) { this.disputeStatus = disputeStatus; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getCardBrand() { return cardBrand; }
    public void setCardBrand(String cardBrand) { this.cardBrand = cardBrand; }

    public String getLast4() { return last4; }
    public void setLast4(String last4) { this.last4 = last4; }

    public String getReceiptUrl() { return receiptUrl; }
    public void setReceiptUrl(String receiptUrl) { this.receiptUrl = receiptUrl; }

    public String getInvoiceUrl() { return invoiceUrl; }
    public void setInvoiceUrl(String invoiceUrl) { this.invoiceUrl = invoiceUrl; }

    public String getPayerName() { return payerName; }
    public void setPayerName(String payerName) { this.payerName = payerName; }

    public String getPayerEmail() { return payerEmail; }
    public void setPayerEmail(String payerEmail) { this.payerEmail = payerEmail; }

    public String getBillingCountry() { return billingCountry; }
    public void setBillingCountry(String billingCountry) { this.billingCountry = billingCountry; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }

    public String getFraudScore() { return fraudScore; }
    public void setFraudScore(String fraudScore) { this.fraudScore = fraudScore; }

    public String getWebhookEventId() { return webhookEventId; }
    public void setWebhookEventId(String webhookEventId) { this.webhookEventId = webhookEventId; }

    public String getWebhookPayload() { return webhookPayload; }
    public void setWebhookPayload(String webhookPayload) { this.webhookPayload = webhookPayload; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }

    public boolean isDeletedFlag() { return deletedFlag; }
    public void setDeletedFlag(boolean deletedFlag) { this.deletedFlag = deletedFlag; }
}
