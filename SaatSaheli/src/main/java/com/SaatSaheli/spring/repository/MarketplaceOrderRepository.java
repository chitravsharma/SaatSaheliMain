package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.MarketplaceOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MarketplaceOrderRepository extends JpaRepository<MarketplaceOrder, Long> {
    Optional<MarketplaceOrder> findByStripeSessionId(String stripeSessionId);
    Optional<MarketplaceOrder> findByOrderNumber(String orderNumber);
    boolean existsByOrderNumber(String orderNumber);
    List<MarketplaceOrder> findByUserIdOrderByCreatedDateDesc(Long userId);
    List<MarketplaceOrder> findAllByOrderByCreatedDateDesc();
    List<MarketplaceOrder> findByUserIdAndStatus(Long userId, String status);
}
