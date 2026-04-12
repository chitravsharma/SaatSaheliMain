package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.Advertisement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AdvertisementRepository extends JpaRepository<Advertisement, Long> {
    List<Advertisement> findByActiveTrueOrderByCreatedDateDesc();
    List<Advertisement> findAllByOrderByCreatedDateDesc();
    List<Advertisement> findByUserIdOrderByCreatedDateDesc(Long userId);
}
