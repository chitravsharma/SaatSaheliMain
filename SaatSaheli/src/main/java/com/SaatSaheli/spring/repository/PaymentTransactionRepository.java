package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {

    // Idempotency: a provider webhook event maps to at most one inserted row.
    Optional<PaymentTransaction> findByWebhookEventId(String webhookEventId);

    // Used to attach a refund/dispute status update to the originating payment.
    Optional<PaymentTransaction> findByProviderPaymentId(String providerPaymentId);

    List<PaymentTransaction> findByDeletedFlagFalseOrderByCreatedAtDesc();

    List<PaymentTransaction> findByPaymentTypeAndDeletedFlagFalseOrderByCreatedAtDesc(String paymentType);
}
