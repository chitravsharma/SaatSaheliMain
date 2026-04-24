package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.model.Recipe;
import com.SaatSaheli.spring.service.RecipeService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/recipes")
public class RecipeController {

    @Autowired
    private RecipeService recipeService;

    @PostMapping
    public ResponseEntity<?> createRecipe(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            Long jwtUserId = (Long) request.getAttribute("jwtUserId");
            if (jwtUserId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorMap("Authentication required"));
            }
            Object bodyUserId = body.get("userId");
            if (bodyUserId != null) {
                Long parsed = Long.parseLong(bodyUserId.toString());
                if (!jwtUserId.equals(parsed)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(errorMap("Body userId does not match authenticated user"));
                }
            }
            String recipeName = (String) body.get("recipeName");
            if (recipeName == null || recipeName.isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("Recipe name is required"));
            }
            @SuppressWarnings("unchecked")
            List<Map<String, String>> images = (List<Map<String, String>>) body.get("images");
            Recipe recipe = recipeService.createRecipe(
                    jwtUserId,
                    recipeName,
                    (String) body.get("cuisine"),
                    (String) body.get("ingredients"),
                    (String) body.get("instructions"),
                    (String) body.get("status"),
                    images);
            return ResponseEntity.ok(recipe);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to create recipe: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateRecipe(@PathVariable Long id, @RequestBody Map<String, Object> body,
                                          HttpServletRequest request) {
        try {
            Long jwtUserId = (Long) request.getAttribute("jwtUserId");
            if (jwtUserId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorMap("Authentication required"));
            }
            Object bodyUserId = body.get("userId");
            if (bodyUserId != null) {
                Long parsed = Long.parseLong(bodyUserId.toString());
                if (!jwtUserId.equals(parsed)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(errorMap("Body userId does not match authenticated user"));
                }
            }
            @SuppressWarnings("unchecked")
            List<Map<String, String>> images = (List<Map<String, String>>) body.get("images");
            Recipe recipe = recipeService.updateRecipe(
                    id,
                    jwtUserId,
                    (String) body.get("recipeName"),
                    (String) body.get("cuisine"),
                    (String) body.get("ingredients"),
                    (String) body.get("instructions"),
                    (String) body.get("status"),
                    images);
            return ResponseEntity.ok(recipe);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to update recipe: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteRecipe(@PathVariable Long id, @RequestParam(required = false) Long userId) {
        try {
            recipeService.deleteRecipe(id, userId);
            return ResponseEntity.ok(Map.of("message", "Recipe deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to delete recipe: " + e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getAllRecipes() {
        try {
            return ResponseEntity.ok(recipeService.getPublishedRecipes());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to get recipes: " + e.getMessage()));
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getRecipesByUser(@PathVariable Long userId) {
        try {
            return ResponseEntity.ok(recipeService.getRecipesByUser(userId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to get recipes: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getRecipe(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(recipeService.getRecipe(id));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to get recipe: " + e.getMessage()));
        }
    }

    private Map<String, String> errorMap(String message) {
        Map<String, String> map = new HashMap<>();
        map.put("error", message);
        return map;
    }
}
