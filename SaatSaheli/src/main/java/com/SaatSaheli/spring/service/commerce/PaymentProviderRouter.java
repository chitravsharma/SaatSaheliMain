package com.SaatSaheli.spring.service.commerce;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Picks the right PaymentProvider for a given currency. Routes INR to Razorpay, others to Stripe.
 * Spring injects all PaymentProvider beans automatically; this class wraps the lookup logic
 * so call sites stay simple.
 */
@Service
public class PaymentProviderRouter {

    private final List<PaymentProvider> providers;

    @Autowired
    public PaymentProviderRouter(List<PaymentProvider> providers) {
        this.providers = providers;
    }

    public PaymentProvider forCurrency(String currencyCode) {
        for (PaymentProvider p : providers) {
            if (p.supports(currencyCode)) {
                return p;
            }
        }
        throw new IllegalArgumentException("No payment provider supports currency: " + currencyCode);
    }

    /** Lookup by stored provider key (used when handling a webhook for an existing order). */
    public PaymentProvider byKey(String providerKey) {
        for (PaymentProvider p : providers) {
            if (p.getProviderKey().equals(providerKey)) {
                return p;
            }
        }
        throw new IllegalArgumentException("Unknown payment provider: " + providerKey);
    }
}
