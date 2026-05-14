package com.SaatSaheli.spring.service.commerce;

import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Stripe Checkout one-off payment provider. Handles non-INR currencies.
 * Stripe India is restricted for most accounts, so INR routes through Razorpay instead.
 */
@Service
public class StripeCheckoutProvider implements PaymentProvider {

    private static final Logger log = LoggerFactory.getLogger(StripeCheckoutProvider.class);

    // ISO 4217 codes Stripe handles for this account. Extend as needed.
    private static final Set<String> SUPPORTED_CURRENCIES = Set.of("USD", "EUR", "GBP", "CAD", "AUD");

    @Value("${stripe.secret-key:}")
    private String stripeSecretKey;

    @Value("${stripe.webhook-secret:}")
    private String stripeWebhookSecret;

    @PostConstruct
    public void init() {
        if (isConfigured()) {
            Stripe.apiKey = stripeSecretKey;
            log.info("StripeCheckoutProvider configured");
        } else {
            log.warn("StripeCheckoutProvider: stripe.secret-key not set — non-INR checkout disabled");
        }
    }

    @Override
    public String getProviderKey() { return "stripe"; }

    @Override
    public boolean supports(String currencyCode) {
        return currencyCode != null && SUPPORTED_CURRENCIES.contains(currencyCode.toUpperCase());
    }

    @Override
    public boolean isConfigured() {
        return stripeSecretKey != null && !stripeSecretKey.isEmpty();
    }

    @Override
    public CheckoutResult createCheckoutSession(CheckoutRequest request) throws PaymentProviderException {
        if (!isConfigured()) {
            throw new PaymentProviderException("Stripe not configured");
        }
        try {
            SessionCreateParams.Builder params = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setCustomerEmail(request.buyerEmail())
                    .setSuccessUrl(request.successUrl())
                    .setCancelUrl(request.cancelUrl())
                    .putMetadata("orderId", request.orderId());

            if (request.metadata() != null) {
                request.metadata().forEach(params::putMetadata);
            }

            for (CheckoutRequest.LineItem item : request.items()) {
                params.addLineItem(
                        SessionCreateParams.LineItem.builder()
                                .setQuantity((long) item.quantity())
                                .setPriceData(
                                        SessionCreateParams.LineItem.PriceData.builder()
                                                .setCurrency(request.currency().toLowerCase())
                                                .setUnitAmount(item.unitPriceMinorUnits())
                                                .setProductData(
                                                        SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                                                .setName(item.name())
                                                                .setDescription(item.description() != null ? item.description() : "")
                                                                .build()
                                                )
                                                .build()
                                )
                                .build()
                );
            }

            Session session = Session.create(params.build());
            return new CheckoutResult(session.getId(), session.getUrl());
        } catch (Exception e) {
            throw new PaymentProviderException("Stripe createCheckoutSession failed", e);
        }
    }

    @Override
    public WebhookEvent parseWebhook(String payload, String signatureHeader) throws PaymentProviderException {
        try {
            Event event;
            if (stripeWebhookSecret != null && !stripeWebhookSecret.isEmpty()) {
                event = Webhook.constructEvent(payload, signatureHeader, stripeWebhookSecret);
            } else {
                log.warn("Stripe webhook secret not set — accepting payload without verification (dev only)");
                event = Event.GSON.fromJson(payload, Event.class);
            }

            String type = event.getType();
            if ("checkout.session.completed".equals(type)) {
                Session session = (Session) event.getDataObjectDeserializer().getObject().orElse(null);
                if (session != null) {
                    Map<String, String> meta = session.getMetadata() != null ? session.getMetadata() : new HashMap<>();
                    return new WebhookEvent(WebhookEvent.EventType.CHECKOUT_COMPLETED, session.getId(), meta.get("orderId"), meta);
                }
            } else if ("checkout.session.expired".equals(type) || "checkout.session.async_payment_failed".equals(type)) {
                Session session = (Session) event.getDataObjectDeserializer().getObject().orElse(null);
                if (session != null) {
                    Map<String, String> meta = session.getMetadata() != null ? session.getMetadata() : new HashMap<>();
                    return new WebhookEvent(WebhookEvent.EventType.CHECKOUT_FAILED, session.getId(), meta.get("orderId"), meta);
                }
            }
            return new WebhookEvent(WebhookEvent.EventType.OTHER, null, null, new HashMap<>());

        } catch (SignatureVerificationException e) {
            throw new PaymentProviderException("Invalid Stripe webhook signature", e);
        } catch (Exception e) {
            throw new PaymentProviderException("Stripe webhook parse failed", e);
        }
    }
}
