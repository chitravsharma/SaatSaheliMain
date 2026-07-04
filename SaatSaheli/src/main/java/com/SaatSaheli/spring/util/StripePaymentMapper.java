package com.SaatSaheli.spring.util;

import com.SaatSaheli.spring.model.PaymentTransaction;
import com.stripe.model.BalanceTransaction;
import com.stripe.model.Charge;
import com.stripe.model.Invoice;
import com.stripe.model.PaymentIntent;
import com.stripe.model.checkout.Session;
import com.stripe.param.PaymentIntentRetrieveParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;

/**
 * Builds a {@link PaymentTransaction} audit row from a completed Stripe Checkout
 * Session, enriching card / fee / receipt / risk details from the underlying
 * PaymentIntent's charge. All Stripe lookups are best-effort: if enrichment fails
 * the core row is still returned with those fields left null, so webhook ingestion
 * never breaks on a secondary lookup.
 */
public final class StripePaymentMapper {

    private static final Logger log = LoggerFactory.getLogger(StripePaymentMapper.class);

    private StripePaymentMapper() {}

    public static PaymentTransaction fromSession(Session session, String paymentType, Long userId,
                                                 String eventId, String payload) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        Map<String, String> md = session.getMetadata();

        PaymentTransaction tx = new PaymentTransaction();
        tx.setPaymentReferenceId(newReference());
        tx.setProvider(PaymentTransaction.PROVIDER_STRIPE);
        tx.setPaymentType(paymentType);
        tx.setOrderId(session.getId());
        tx.setProviderPaymentId(session.getPaymentIntent());
        tx.setProviderCustomerId(session.getCustomer());
        tx.setUserId(userId);

        if (session.getAmountTotal() != null) {
            tx.setAmount(BigDecimal.valueOf(session.getAmountTotal()).movePointLeft(2));
        }
        tx.setCurrency(session.getCurrency());
        if (session.getTotalDetails() != null && session.getTotalDetails().getAmountTax() != null) {
            tx.setTaxAmount(BigDecimal.valueOf(session.getTotalDetails().getAmountTax()).movePointLeft(2));
        }
        tx.setPaymentStatus("paid".equalsIgnoreCase(session.getPaymentStatus()) ? "Paid" : session.getPaymentStatus());

        Session.CustomerDetails cd = session.getCustomerDetails();
        if (cd != null) {
            tx.setPayerName(cd.getName());
            tx.setPayerEmail(cd.getEmail());
            if (cd.getAddress() != null) tx.setBillingCountry(cd.getAddress().getCountry());
        }
        if (tx.getPayerEmail() == null) tx.setPayerEmail(session.getCustomerEmail());
        if (md != null) {
            if (tx.getPayerName() == null) tx.setPayerName(md.get("supporterName"));
            tx.setIpAddress(md.get("ip"));
            tx.setUserAgent(md.get("ua"));
        }

        tx.setWebhookEventId(eventId);
        tx.setWebhookPayload(payload);
        tx.setCreatedAt(now);
        tx.setPaidAt("Paid".equals(tx.getPaymentStatus()) ? now : null);
        tx.setUpdatedAt(now);
        tx.setCreatedBy("stripe-webhook");
        tx.setUpdatedBy("stripe-webhook");
        tx.setDeletedFlag(false);

        enrichFromCharge(tx, session.getPaymentIntent());
        enrichInvoiceFromSession(tx, session);
        return tx;
    }

    /**
     * For subscription / invoiced payments the durable receipt lives on the Stripe
     * Invoice (hosted_invoice_url), not the Charge. Best-effort: leaves invoice_url
     * null for one-time payments (session has no invoice) or on lookup failure.
     */
    private static void enrichInvoiceFromSession(PaymentTransaction tx, Session session) {
        String invoiceId = session.getInvoice();
        if (invoiceId == null) return;
        try {
            Invoice inv = Invoice.retrieve(invoiceId);
            if (inv.getHostedInvoiceUrl() != null) tx.setInvoiceUrl(inv.getHostedInvoiceUrl());
        } catch (Exception e) {
            log.warn("Could not enrich invoice url from session {}: {}", session.getId(), e.getMessage());
        }
    }

    /**
     * Self-healing backfill for an existing ledger row: re-derives receipt_url (from the
     * charge behind the stored PaymentIntent) and invoice_url (from the stored Checkout
     * Session's invoice) using only ids already persisted. Best-effort per-field; returns
     * true if any field changed. Callers persist + set updatedAt/updatedBy when true.
     */
    public static boolean refreshFromStripe(PaymentTransaction tx) {
        boolean changed = false;

        String paymentIntentId = tx.getProviderPaymentId();
        if (paymentIntentId != null) {
            try {
                PaymentIntent pi = PaymentIntent.retrieve(
                        paymentIntentId,
                        PaymentIntentRetrieveParams.builder().addExpand("latest_charge").build(),
                        null);
                Charge ch = pi.getLatestChargeObject();
                if (ch != null && ch.getReceiptUrl() != null
                        && !ch.getReceiptUrl().equals(tx.getReceiptUrl())) {
                    tx.setReceiptUrl(ch.getReceiptUrl());
                    changed = true;
                }
            } catch (Exception e) {
                log.warn("refreshFromStripe: receipt lookup failed for PaymentIntent {}: {}",
                        paymentIntentId, e.getMessage());
            }
        }

        String sessionId = tx.getOrderId();
        if (tx.getInvoiceUrl() == null && sessionId != null) {
            try {
                String invoiceId = Session.retrieve(sessionId).getInvoice();
                if (invoiceId != null) {
                    String url = Invoice.retrieve(invoiceId).getHostedInvoiceUrl();
                    if (url != null) {
                        tx.setInvoiceUrl(url);
                        changed = true;
                    }
                }
            } catch (Exception e) {
                log.warn("refreshFromStripe: invoice lookup failed for session {}: {}",
                        sessionId, e.getMessage());
            }
        }

        return changed;
    }

    private static void enrichFromCharge(PaymentTransaction tx, String paymentIntentId) {
        if (paymentIntentId == null) return;
        try {
            PaymentIntent pi = PaymentIntent.retrieve(
                    paymentIntentId,
                    PaymentIntentRetrieveParams.builder().addExpand("latest_charge.balance_transaction").build(),
                    null);
            Charge ch = pi.getLatestChargeObject();
            if (ch == null) return;

            tx.setReceiptUrl(ch.getReceiptUrl());
            if (ch.getPaymentMethodDetails() != null) {
                tx.setPaymentMethod(ch.getPaymentMethodDetails().getType());
                Charge.PaymentMethodDetails.Card card = ch.getPaymentMethodDetails().getCard();
                if (card != null) {
                    tx.setCardBrand(card.getBrand());
                    tx.setLast4(card.getLast4());
                }
            }
            if (ch.getOutcome() != null) tx.setFraudScore(ch.getOutcome().getRiskLevel());
            if (tx.getBillingCountry() == null && ch.getBillingDetails() != null
                    && ch.getBillingDetails().getAddress() != null) {
                tx.setBillingCountry(ch.getBillingDetails().getAddress().getCountry());
            }
            BalanceTransaction bt = ch.getBalanceTransactionObject();
            if (bt != null) {
                tx.setGatewayFee(BigDecimal.valueOf(bt.getFee()).movePointLeft(2));
                tx.setNetAmount(BigDecimal.valueOf(bt.getNet()).movePointLeft(2));
            }
        } catch (Exception e) {
            log.warn("Could not enrich payment row from PaymentIntent {}: {}", paymentIntentId, e.getMessage());
        }
    }

    private static String newReference() {
        return "PAY-" + java.time.Year.now() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
