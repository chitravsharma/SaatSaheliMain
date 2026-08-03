package com.SaatSaheli.spring.controller;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.SaatSaheli.spring.model.MarketplaceListing;
import com.SaatSaheli.spring.service.MarketplaceService;
import com.SaatSaheli.spring.util.RoleUtil;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/marketplace")
public class MarketplaceController {

    @Autowired
    private MarketplaceService marketplaceService;

    // Only Admin / SuperAdmin may create and manage listings. The JwtInterceptor
    // stamps the caller's role onto the request; browsing stays public.
    private boolean isAdmin(HttpServletRequest request) {
        Object role = request.getAttribute("jwtRole");
        return role instanceof String && RoleUtil.isAdmin((String) role);
    }

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
    public ResponseEntity<?> createListing(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        if (!isAdmin(request)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Only admins can create listings"));
        }
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
            String image3Url = (String) body.get("image3Url");
            String image4Url = (String) body.get("image4Url");

            if (price == null || price.trim().isEmpty()) return ResponseEntity.badRequest().body(errorMap("Price is required"));
            if (contactInfo == null || contactInfo.trim().isEmpty()) return ResponseEntity.badRequest().body(errorMap("Contact info is required"));

            BigDecimal priceAmount = parseAmount(body.get("priceAmount"));
            if (priceAmount != null && priceAmount.signum() <= 0) {
                return ResponseEntity.badRequest().body(errorMap("Price amount must be greater than 0"));
            }
            String currency = (String) body.get("currency");
            Integer quantity = parseQuantity(body.get("quantity"));
            BigDecimal deliveryFee = parseAmount(body.get("deliveryFee")); // null = Free (legacy default)

            MarketplaceListing listing = marketplaceService.createListing(userId, title.trim(), description,
                    price.trim(), category, condition, contactInfo.trim(), image1Url, image2Url,
                    image3Url, image4Url, priceAmount, currency, quantity, deliveryFee);
            return ResponseEntity.ok(listing);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to create listing: " + e.getMessage()));
        }
    }

    // Update listing
    @PutMapping("/{id}")
    public ResponseEntity<?> updateListing(@PathVariable Long id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        if (!isAdmin(request)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Only admins can update listings"));
        }
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
            String image3Url = (String) body.get("image3Url");
            String image4Url = (String) body.get("image4Url");

            BigDecimal priceAmount = parseAmount(body.get("priceAmount"));
            if (priceAmount != null && priceAmount.signum() <= 0) {
                return ResponseEntity.badRequest().body(errorMap("Price amount must be greater than 0"));
            }
            String currency = (String) body.get("currency");
            Integer quantity = parseQuantity(body.get("quantity"));
            String status = (String) body.get("status"); // ACTIVE | INACTIVE (admin availability)
            BigDecimal deliveryFee = body.containsKey("deliveryFee") ? parseAmount(body.get("deliveryFee")) : null;

            MarketplaceListing listing = marketplaceService.updateListing(id, userId, title, description,
                    price, category, condition, contactInfo, image1Url, image2Url,
                    image3Url, image4Url, priceAmount, currency, quantity, status, deliveryFee, isAdmin(request));
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
    public ResponseEntity<?> deleteListing(@PathVariable Long id, @RequestParam(required = false) Long userId, HttpServletRequest request) {
        if (!isAdmin(request)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Only admins can delete listings"));
        }
        try {
            marketplaceService.deleteListing(id, userId, isAdmin(request));
            return ResponseEntity.ok(Map.of("message", "Listing deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to delete listing: " + e.getMessage()));
        }
    }

    // Parse an optional numeric price from the request body. Returns null when
    // absent/blank/unparseable so the listing is simply treated as not purchasable.
    private BigDecimal parseAmount(Object raw) {
        if (raw == null) return null;
        String s = raw.toString().trim();
        if (s.isEmpty()) return null;
        try {
            return new BigDecimal(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Integer parseQuantity(Object raw) {
        if (raw == null) return null;
        String s = raw.toString().trim();
        if (s.isEmpty()) return null;
        try {
            return Math.max(0, Integer.parseInt(s));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Map<String, String> errorMap(String message) {
        Map<String, String> map = new HashMap<>();
        map.put("error", message);
        return map;
    }
}
