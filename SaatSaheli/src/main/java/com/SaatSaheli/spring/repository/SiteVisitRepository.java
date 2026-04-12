package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.SiteVisit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SiteVisitRepository extends JpaRepository<SiteVisit, Long> {

    List<SiteVisit> findAllByOrderByVisitedAtDesc();

    List<SiteVisit> findByVisitedAtAfterOrderByVisitedAtDesc(LocalDateTime after);

    @Query("SELECT COUNT(DISTINCT v.visitorId) FROM SiteVisit v WHERE v.visitedAt > :after")
    long countUniqueVisitorsSince(@Param("after") LocalDateTime after);

    @Query("SELECT COUNT(v) FROM SiteVisit v WHERE v.visitedAt > :after")
    long countPageViewsSince(@Param("after") LocalDateTime after);

    @Query("SELECT COUNT(DISTINCT v.sessionId) FROM SiteVisit v WHERE v.visitedAt > :after")
    long countSessionsSince(@Param("after") LocalDateTime after);

    @Query("SELECT COUNT(DISTINCT v.visitorId) FROM SiteVisit v WHERE v.userId IS NULL AND v.visitedAt > :after")
    long countAnonymousVisitorsSince(@Param("after") LocalDateTime after);

    @Query("SELECT v.pagePath, COUNT(v) as cnt FROM SiteVisit v WHERE v.visitedAt > :after GROUP BY v.pagePath ORDER BY cnt DESC")
    List<Object[]> topPagesSince(@Param("after") LocalDateTime after);

    @Query("SELECT v.device, COUNT(v) as cnt FROM SiteVisit v WHERE v.visitedAt > :after GROUP BY v.device ORDER BY cnt DESC")
    List<Object[]> deviceBreakdownSince(@Param("after") LocalDateTime after);

    @Query("SELECT v.browser, COUNT(v) as cnt FROM SiteVisit v WHERE v.visitedAt > :after GROUP BY v.browser ORDER BY cnt DESC")
    List<Object[]> browserBreakdownSince(@Param("after") LocalDateTime after);

    @Query("SELECT CAST(v.visitedAt AS date), COUNT(v), COUNT(DISTINCT v.visitorId) FROM SiteVisit v WHERE v.visitedAt > :after GROUP BY CAST(v.visitedAt AS date) ORDER BY CAST(v.visitedAt AS date)")
    List<Object[]> dailyStatsSince(@Param("after") LocalDateTime after);
}
