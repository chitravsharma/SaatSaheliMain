package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.config.SaatSaheliRevisionEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RevisionInfoRepository extends JpaRepository<SaatSaheliRevisionEntity, Integer> {
    List<SaatSaheliRevisionEntity> findAllByOrderByTimestampDesc(Pageable pageable);
}
