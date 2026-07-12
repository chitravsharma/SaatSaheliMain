package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.model.CartItem;
import com.SaatSaheli.spring.service.CartService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Server-side, per-user marketplace cart. All endpoints require a logged-in user
 * (jwtUserId set by JwtInterceptor); browsing the marketplace stays public but
 * buying does not.
 */
@RestController
@RequestMapping("/api/marketplace/cart")
public class CartController {

    @Autowired
    private CartService cartService;

    @GetMapping
    public ResponseEntity<?> getCart(HttpServletRequest request) {
        Long userId = authUserId(request);
        if (userId == null) return unauthorized();
        try {
            List<CartItem> items = cartService.getCart(userId);
            return ResponseEntity.ok(items);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to load cart: " + e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> addToCart(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Long userId = authUserId(request);
        if (userId == null) return unauthorized();
        Long listingId = body.get("listingId") != null ? Long.parseLong(body.get("listingId").toString()) : null;
        if (listingId == null) return ResponseEntity.badRequest().body(errorMap("listingId is required"));
        try {
            CartItem item = cartService.addToCart(userId, listingId);
            return ResponseEntity.ok(item);
        } catch (CartService.CartException e) {
            return ResponseEntity.badRequest().body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to add to cart: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{listingId}")
    public ResponseEntity<?> removeFromCart(@PathVariable Long listingId, HttpServletRequest request) {
        Long userId = authUserId(request);
        if (userId == null) return unauthorized();
        try {
            cartService.removeFromCart(userId, listingId);
            return ResponseEntity.ok(Map.of("message", "Removed from cart"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to remove from cart: " + e.getMessage()));
        }
    }

    @DeleteMapping
    public ResponseEntity<?> clearCart(HttpServletRequest request) {
        Long userId = authUserId(request);
        if (userId == null) return unauthorized();
        try {
            cartService.clearCart(userId);
            return ResponseEntity.ok(Map.of("message", "Cart cleared"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to clear cart: " + e.getMessage()));
        }
    }

    private Long authUserId(HttpServletRequest request) {
        Object val = request.getAttribute("jwtUserId");
        return val instanceof Long ? (Long) val : null;
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorMap("Please log in to use your cart"));
    }

    private Map<String, String> errorMap(String message) {
        Map<String, String> map = new HashMap<>();
        map.put("error", message);
        return map;
    }
}
