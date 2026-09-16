package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.MediaAsset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface MediaAssetRepository extends JpaRepository<MediaAsset, Long> {
    Optional<MediaAsset> findByUrl(String url);
    boolean existsByUrl(String url);
    List<MediaAsset> findByUrlIn(Collection<String> urls);
}
