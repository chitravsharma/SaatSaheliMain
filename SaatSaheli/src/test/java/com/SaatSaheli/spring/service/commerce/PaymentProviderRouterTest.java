package com.SaatSaheli.spring.service.commerce;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PaymentProviderRouterTest {

    private final StripeCheckoutProvider stripe = new StripeCheckoutProvider();
    private final RazorpayCheckoutProvider razorpay = new RazorpayCheckoutProvider();
    private final PaymentProviderRouter router = new PaymentProviderRouter(List.of(stripe, razorpay));

    @Test
    void inrRoutesToRazorpay() {
        assertThat(router.forCurrency("INR").getProviderKey()).isEqualTo("razorpay");
    }

    @Test
    void usdRoutesToStripe() {
        assertThat(router.forCurrency("USD").getProviderKey()).isEqualTo("stripe");
    }

    @Test
    void eurRoutesToStripe() {
        assertThat(router.forCurrency("EUR").getProviderKey()).isEqualTo("stripe");
    }

    @Test
    void currencyMatchingIsCaseInsensitive() {
        assertThat(router.forCurrency("inr").getProviderKey()).isEqualTo("razorpay");
        assertThat(router.forCurrency("usd").getProviderKey()).isEqualTo("stripe");
    }

    @Test
    void unknownCurrencyThrows() {
        assertThatThrownBy(() -> router.forCurrency("XYZ"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("XYZ");
    }

    @Test
    void byKeyFindsEachProvider() {
        assertThat(router.byKey("stripe").getProviderKey()).isEqualTo("stripe");
        assertThat(router.byKey("razorpay").getProviderKey()).isEqualTo("razorpay");
    }

    @Test
    void byKeyUnknownThrows() {
        assertThatThrownBy(() -> router.byKey("paypal"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("paypal");
    }

    @Test
    void providersReportUnconfiguredWithoutCredentials() {
        // Without Spring injecting @Value fields, secrets are null → isConfigured() returns false.
        // This is the expected behavior before keys are added to the env.
        assertThat(stripe.isConfigured()).isFalse();
        assertThat(razorpay.isConfigured()).isFalse();
    }
}
