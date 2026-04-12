package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.MarketplaceListing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MarketplaceListingRepository extends JpaRepository<MarketplaceListing, Long> {
    List<MarketplaceListing> findByStatusOrderByCreatedDateDesc(String status);
    List<MarketplaceListing> findByUserIdOrderByCreatedDateDesc(Long userId);
    List<MarketplaceListing> findAllByOrderByCreatedDateDesc();
}
