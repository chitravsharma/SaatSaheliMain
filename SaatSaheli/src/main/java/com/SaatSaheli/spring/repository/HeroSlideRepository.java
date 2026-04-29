package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.HeroSlide;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HeroSlideRepository extends JpaRepository<HeroSlide, Integer> {
    List<HeroSlide> findAllByOrderBySlotAsc();
}
