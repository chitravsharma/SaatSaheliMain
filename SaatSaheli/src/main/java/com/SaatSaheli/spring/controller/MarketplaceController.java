package com.SaatSaheli.spring.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.SaatSaheli.spring.model.MarketplaceListing;
import com.SaatSaheli.spring.service.MarketplaceService;

@RestController
@RequestMapping("/api/marketplace")
public class MarketplaceController {

    @Autowired
    private MarketplaceService marketplaceService;

    // Public: get active listings
    @GetMapping("/active")
    public ResponseEntity<?> getActiveListings() {
        try {
            return ResponseEntity.ok(marketplaceService.getActiveListings());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to get listings: " + e.getMessage()));
        }
    }

    // Get all listings (admin)
    @GetMapping
    public ResponseEntity<?> getAllListings() {
        try {
            return ResponseEntity.ok(marketplaceService.getAllListings());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to get listings: " + e.getMessage()));
        }
    }

    // Get listings by user
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getListingsByUser(@PathVariable Long userId) {
        try {
            return ResponseEntity.ok(marketplaceService.getListingsByUser(userId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to get listings: " + e.getMessage()));
        }
    }

    // Get single listing
    @GetMapping("/{id}")
    public ResponseEntity<?> getListing(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(marketplaceService.getListing(id));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to get listing: " + e.getMessage()));
        }
    }

    // Create listing
    @PostMapping
    public ResponseEntity<?> createListing(@RequestBody Map<String, Object> body) {
        try {
            Long userId = body.get("userId") != null ? Long.parseLong(body.get("userId").toString()) : null;
            String title = (String) body.get("title");
            if (userId == null) return ResponseEntity.badRequest().body(errorMap("userId is required"));
            if (title == null || title.trim().isEmpty()) return ResponseEntity.badRequest().body(errorMap("Title is required"));

            String description = (String) body.get("description");
            String price = (String) body.get("price");
            String category = (String) body.get("category");
            String condition = (String) body.get("condition");
            String contactInfo = (String) body.get("contactInfo");
            String image1Url = (String) body.get("image1Url");
            String image2Url = (String) body.get("image2Url");

            if (price == null || price.trim().isEmpty()) return ResponseEntity.badRequest().body(errorMap("Price is required"));
            if (contactInfo == null || contactInfo.trim().isEmpty()) return ResponseEntity.badRequest().body(errorMap("Contact info is required"));

            MarketplaceListing listing = marketplaceService.createListing(userId, title.trim(), description,
                    price.trim(), category, condition, contactInfo.trim(), image1Url, image2Url);
            return ResponseEntity.ok(listing);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to create listing: " + e.getMessage()));
        }
    }

    // Update listing
    @PutMapping("/{id}")
    public ResponseEntity<?> updateListing(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            Long userId = body.get("userId") != null ? Long.parseLong(body.get("userId").toString()) : null;
            String title = (String) body.get("title");
            String description = (String) body.get("description");
            String price = (String) body.get("price");
            String category = (String) body.get("category");
            String condition = (String) body.get("condition");
            String contactInfo = (String) body.get("contactInfo");
            String image1Url = (String) body.get("image1Url");
            String image2Url = (String) body.get("image2Url");

            MarketplaceListing listing = marketplaceService.updateListing(id, userId, title, description,
                    price, category, condition, contactInfo, image1Url, image2Url);
            return ResponseEntity.ok(listing);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to update listing: " + e.getMessage()));
        }
    }

    // Delete listing
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteListing(@PathVariable Long id, @RequestParam(required = false) Long userId) {
        try {
            marketplaceService.deleteListing(id, userId);
            return ResponseEntity.ok(Map.of("message", "Listing deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to delete listing: " + e.getMessage()));
        }
    }

    private Map<String, String> errorMap(String message) {
        Map<String, String> map = new HashMap<>();
        map.put("error", message);
        return map;
    }
}
