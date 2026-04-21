package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.RecipeImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecipeImageRepository extends JpaRepository<RecipeImage, Long> {
    List<RecipeImage> findByRecipeIdOrderByOrderIndexAsc(Long recipeId);
    void deleteByRecipeId(Long recipeId);
}
