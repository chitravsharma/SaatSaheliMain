package com.SaatSaheli.spring.service.commerce;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Set;

/**
 * Razorpay one-off payment provider for INR. Implementation pending:
 * - Add com.razorpay:razorpay-java dependency to pom.xml
 * - Provision Razorpay account + KYC, set RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET env vars
 * - Implement createCheckoutSession via Razorpay Orders API (preferred) or Payment Links
 * - Implement webhook signature verification (HMAC-SHA256 over payload with webhook secret)
 *
 * Until the SDK is added, this stub throws UnsupportedOperationException on actual calls,
 * but advertises INR support so the routing logic surfaces a clear "Razorpay not configured yet"
 * error instead of silently falling through to Stripe (which would fail on INR).
 */
@Service
public class RazorpayCheckoutProvider implements PaymentProvider {

    private static final Logger log = LoggerFactory.getLogger(RazorpayCheckoutProvider.class);

    private static final Set<String> SUPPORTED_CURRENCIES = Set.of("INR");

    @Value("${razorpay.key-id:}")
    private String razorpayKeyId;

    @Value("${razorpay.key-secret:}")
    private String razorpayKeySecret;

    @Value("${razorpay.webhook-secret:}")
    private String razorpayWebhookSecret;

    @Override
    public String getProviderKey() { return "razorpay"; }

    @Override
    public boolean supports(String currencyCode) {
        return currencyCode != null && SUPPORTED_CURRENCIES.contains(currencyCode.toUpperCase());
    }

    @Override
    public boolean isConfigured() {
        return razorpayKeyId != null && !razorpayKeyId.isEmpty()
                && razorpayKeySecret != null && !razorpayKeySecret.isEmpty();
    }

    @Override
    public CheckoutResult createCheckoutSession(CheckoutRequest request) throws PaymentProviderException {
        throw new PaymentProviderException(
                "Razorpay provider not implemented yet — add com.razorpay:razorpay-java dependency and complete impl");
    }

    @Override
    public WebhookEvent parseWebhook(String payload, String signatureHeader) throws PaymentProviderException {
        throw new PaymentProviderException("Razorpay webhook handler not implemented yet");
    }
}
