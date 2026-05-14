package com.SaatSaheli.spring.service.commerce;

import java.util.List;
import java.util.Map;

/**
 * One-off (Mode.PAYMENT) hosted checkout provider for e-commerce orders.
 *
 * Two impls planned: StripeCheckoutProvider for non-INR, RazorpayCheckoutProvider for INR.
 * The order service picks an impl at runtime based on order currency.
 *
 * Note: this abstraction is intentionally separate from the subscription flow in
 * PaymentController (Premium/Gold/Creator plans). Subscriptions stay on Stripe-only
 * for now; if we later want INR subscriptions, this abstraction can be extended.
 */
public interface PaymentProvider {

    /** Stable identifier persisted on the order row, e.g. "stripe", "razorpay". */
    String getProviderKey();

    /** Does this provider handle the given ISO 4217 currency code? */
    boolean supports(String currencyCode);

    /** Whether the provider is configured (API keys present). Used to skip a non-configured provider at boot. */
    boolean isConfigured();

    /** Create a hosted checkout session and return the URL to redirect the buyer to. */
    CheckoutResult createCheckoutSession(CheckoutRequest request) throws PaymentProviderException;

    /** Verify webhook signature and parse the event. Throws on invalid signature. */
    WebhookEvent parseWebhook(String payload, String signatureHeader) throws PaymentProviderException;

    record CheckoutRequest(
            String orderId,
            long totalMinorUnits,    // paise for INR, cents for USD
            String currency,          // ISO 4217: "INR", "USD", ...
            String buyerEmail,
            String successUrl,
            String cancelUrl,
            List<LineItem> items,
            Map<String, String> metadata
    ) {
        public record LineItem(String name, String description, long unitPriceMinorUnits, int quantity) {}
    }

    record CheckoutResult(String providerSessionId, String checkoutUrl) {}

    /** Provider-agnostic webhook event. orderId comes from metadata round-tripped through the provider. */
    record WebhookEvent(EventType type, String providerSessionId, String orderId, Map<String, String> metadata) {
        public enum EventType { CHECKOUT_COMPLETED, CHECKOUT_FAILED, OTHER }
    }

    class PaymentProviderException extends Exception {
        public PaymentProviderException(String message) { super(message); }
        public PaymentProviderException(String message, Throwable cause) { super(message, cause); }
    }
}
