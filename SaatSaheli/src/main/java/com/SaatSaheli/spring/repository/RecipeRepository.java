package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.Recipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecipeRepository extends JpaRepository<Recipe, Long> {
    List<Recipe> findByUserIdOrderByCreatedDateDesc(Long userId);
    List<Recipe> findByStatusOrderByCreatedDateDesc(String status);
    List<Recipe> findByCuisineAndStatusOrderByCreatedDateDesc(String cuisine, String status);
}
