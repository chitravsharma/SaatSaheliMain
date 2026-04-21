package com.SaatSaheli.spring.service;

import com.SaatSaheli.spring.model.Recipe;
import com.SaatSaheli.spring.model.RecipeImage;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.CommentRepository;
import com.SaatSaheli.spring.repository.ContentLikeRepository;
import com.SaatSaheli.spring.repository.RecipeImageRepository;
import com.SaatSaheli.spring.repository.RecipeRepository;
import com.SaatSaheli.spring.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class RecipeService {

    private static final int MAX_IMAGES = 4;

    @Autowired
    private RecipeRepository recipeRepo;

    @Autowired
    private RecipeImageRepository imageRepo;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private ContentLikeRepository likeRepo;

    @Autowired
    private CommentRepository commentRepo;

    @Transactional
    public Recipe createRecipe(Long userId, String recipeName, String cuisine, String ingredients,
                               String instructions, String status, List<Map<String, String>> images) {
        LocalDateTime now = LocalDateTime.now();
        Recipe recipe = new Recipe();
        recipe.setUserId(userId);
        recipe.setRecipeName(recipeName);
        recipe.setCuisine(cuisine);
        recipe.setIngredients(ingredients);
        recipe.setInstructions(instructions);
        recipe.setStatus(status != null ? status.toUpperCase() : "PUBLISHED");
        recipe.setCreatedDate(now);
        recipe.setModifiedDate(now);
        recipe = recipeRepo.save(recipe);

        if (images != null) {
            int count = 0;
            for (Map<String, String> img : images) {
                if (count >= MAX_IMAGES) break;
                String url = img.get("imageUrl");
                if (url == null || url.isEmpty()) continue;
                RecipeImage ri = new RecipeImage();
                ri.setRecipeId(recipe.getId());
                ri.setImageUrl(url);
                ri.setCaption(img.get("caption"));
                ri.setOrderIndex(count);
                ri.setCreatedDate(now);
                imageRepo.save(ri);
                count++;
            }
        }
        recipe.setImages(imageRepo.findByRecipeIdOrderByOrderIndexAsc(recipe.getId()));
        return recipe;
    }

    public Recipe getRecipe(Long id) {
        Optional<Recipe> opt = recipeRepo.findById(id);
        if (opt.isEmpty()) throw new RuntimeException("Recipe not found");
        Recipe recipe = opt.get();
        recipe.setImages(imageRepo.findByRecipeIdOrderByOrderIndexAsc(id));
        enrichWithAuthor(recipe);
        enrichWithCounts(recipe);
        return recipe;
    }

    public List<Recipe> getPublishedRecipes() {
        List<Recipe> recipes = recipeRepo.findByStatusOrderByCreatedDateDesc("PUBLISHED");
        Map<Long, User> userMap = getUserMap();
        for (Recipe r : recipes) {
            r.setImages(imageRepo.findByRecipeIdOrderByOrderIndexAsc(r.getId()));
            if (r.getUserId() != null && userMap.containsKey(r.getUserId())) {
                r.setAuthorName(buildName(userMap.get(r.getUserId())));
            }
            enrichWithCounts(r);
        }
        return recipes;
    }

    public List<Recipe> getRecipesByUser(Long userId) {
        List<Recipe> recipes = recipeRepo.findByUserIdOrderByCreatedDateDesc(userId);
        for (Recipe r : recipes) {
            r.setImages(imageRepo.findByRecipeIdOrderByOrderIndexAsc(r.getId()));
            enrichWithCounts(r);
        }
        return recipes;
    }

    @Transactional
    public Recipe updateRecipe(Long id, Long requestUserId, String recipeName, String cuisine,
                               String ingredients, String instructions, String status,
                               List<Map<String, String>> images) {
        Optional<Recipe> opt = recipeRepo.findById(id);
        if (opt.isEmpty()) throw new RuntimeException("Recipe not found");
        Recipe recipe = opt.get();
        if (requestUserId != null && !requestUserId.equals(recipe.getUserId())) {
            throw new RuntimeException("Only the author can edit this recipe");
        }
        if (recipeName != null) recipe.setRecipeName(recipeName);
        if (cuisine != null) recipe.setCuisine(cuisine);
        if (ingredients != null) recipe.setIngredients(ingredients);
        if (instructions != null) recipe.setInstructions(instructions);
        if (status != null) recipe.setStatus(status.toUpperCase());
        recipe.setModifiedDate(LocalDateTime.now());
        recipe = recipeRepo.save(recipe);

        if (images != null) {
            // Replace image set entirely on edit
            imageRepo.deleteByRecipeId(id);
            int count = 0;
            LocalDateTime now = LocalDateTime.now();
            for (Map<String, String> img : images) {
                if (count >= MAX_IMAGES) break;
                String url = img.get("imageUrl");
                if (url == null || url.isEmpty()) continue;
                RecipeImage ri = new RecipeImage();
                ri.setRecipeId(id);
                ri.setImageUrl(url);
                ri.setCaption(img.get("caption"));
                ri.setOrderIndex(count);
                ri.setCreatedDate(now);
                imageRepo.save(ri);
                count++;
            }
        }
        recipe.setImages(imageRepo.findByRecipeIdOrderByOrderIndexAsc(id));
        return recipe;
    }

    @Transactional
    public void deleteRecipe(Long id, Long requestUserId) {
        Optional<Recipe> opt = recipeRepo.findById(id);
        if (opt.isEmpty()) return;
        Recipe recipe = opt.get();
        if (requestUserId != null && !requestUserId.equals(recipe.getUserId())) {
            throw new RuntimeException("Only the author can delete this recipe");
        }
        imageRepo.deleteByRecipeId(id);
        recipeRepo.deleteById(id);
    }

    private void enrichWithAuthor(Recipe recipe) {
        if (recipe.getUserId() != null) {
            Optional<User> userOpt = userRepo.findById(recipe.getUserId());
            userOpt.ifPresent(u -> recipe.setAuthorName(buildName(u)));
        }
    }

    private void enrichWithCounts(Recipe recipe) {
        recipe.setLikeCount(likeRepo.countByTargetTypeAndTargetId("RECIPE", recipe.getId()));
        recipe.setCommentCount(commentRepo.countByTargetTypeAndTargetIdAndIsDeletedFalse("RECIPE", recipe.getId()));
    }

    private Map<Long, User> getUserMap() {
        return userRepo.findAll().stream()
                .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));
    }

    private String buildName(User u) {
        String name = (u.getDisplayName() != null && !u.getDisplayName().isEmpty())
                ? u.getDisplayName()
                : ((u.getFirstName() != null ? u.getFirstName() : "") +
                   (u.getLastName() != null ? " " + u.getLastName() : ""));
        return name.trim();
    }
}
