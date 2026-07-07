package com.SaatSaheli.spring.service;

import com.SaatSaheli.spring.model.MarketplaceListing;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.MarketplaceListingRepository;
import com.SaatSaheli.spring.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class MarketplaceService {

    private static final Logger log = LoggerFactory.getLogger(MarketplaceService.class);

    @Autowired
    private MarketplaceListingRepository listingRepo;

    @Autowired
    private UserRepository userRepo;

    public MarketplaceListing createListing(Long userId, String title, String description,
                                             String price, String category, String condition,
                                             String contactInfo, String image1Url, String image2Url,
                                             BigDecimal priceAmount, String currency) {
        LocalDateTime now = LocalDateTime.now();
        MarketplaceListing listing = new MarketplaceListing();
        listing.setUserId(userId);
        listing.setTitle(title);
        listing.setDescription(description);
        listing.setPrice(price);
        listing.setPriceAmount(priceAmount);
        listing.setCurrency(normalizeCurrency(currency, priceAmount));
        listing.setCategory(category != null ? category : "Other");
        listing.setCondition(condition != null ? condition : "Good");
        listing.setContactInfo(contactInfo);
        listing.setImage1Url(image1Url);
        listing.setImage2Url(image2Url);
        listing.setStatus("ACTIVE");
        listing.setCreatedDate(now);
        listing.setModifiedDate(now);
        return listingRepo.save(listing);
    }

    public MarketplaceListing updateListing(Long listingId, Long userId, String title, String description,
                                             String price, String category, String condition,
                                             String contactInfo, String image1Url, String image2Url,
                                             BigDecimal priceAmount, String currency) {
        Optional<MarketplaceListing> opt = listingRepo.findById(listingId);
        if (opt.isEmpty()) throw new RuntimeException("Listing not found");
        MarketplaceListing listing = opt.get();
        if (userId != null && !userId.equals(listing.getUserId())) {
            throw new RuntimeException("Only the owner can edit this listing");
        }
        if (title != null) listing.setTitle(title);
        if (description != null) listing.setDescription(description);
        if (price != null) listing.setPrice(price);
        if (priceAmount != null) {
            listing.setPriceAmount(priceAmount);
            listing.setCurrency(normalizeCurrency(currency, priceAmount));
        }
        if (category != null) listing.setCategory(category);
        if (condition != null) listing.setCondition(condition);
        if (contactInfo != null) listing.setContactInfo(contactInfo);
        if (image1Url != null) listing.setImage1Url(image1Url);
        if (image2Url != null) listing.setImage2Url(image2Url);
        listing.setModifiedDate(LocalDateTime.now());
        return listingRepo.save(listing);
    }

    public void deleteListing(Long listingId, Long userId) {
        Optional<MarketplaceListing> opt = listingRepo.findById(listingId);
        if (opt.isEmpty()) throw new RuntimeException("Listing not found");
        MarketplaceListing listing = opt.get();
        if (userId != null && !userId.equals(listing.getUserId())) {
            throw new RuntimeException("Only the owner can remove this listing");
        }
        listingRepo.deleteById(listingId);
    }

    public List<MarketplaceListing> getActiveListings() {
        List<MarketplaceListing> listings = listingRepo.findByStatusOrderByCreatedDateDesc("ACTIVE");
        enrichWithSellerNames(listings);
        return listings;
    }

    public List<MarketplaceListing> getListingsByUser(Long userId) {
        return listingRepo.findByUserIdOrderByCreatedDateDesc(userId);
    }

    public List<MarketplaceListing> getAllListings() {
        List<MarketplaceListing> listings = listingRepo.findAllByOrderByCreatedDateDesc();
        enrichWithSellerNames(listings);
        return listings;
    }

    public MarketplaceListing getListing(Long id) {
        Optional<MarketplaceListing> opt = listingRepo.findById(id);
        if (opt.isEmpty()) throw new RuntimeException("Listing not found");
        MarketplaceListing listing = opt.get();
        enrichWithSellerNames(List.of(listing));
        return listing;
    }

    // Default to INR when a numeric price is set without an explicit currency;
    // fall back to null (not purchasable) when there is no numeric price at all.
    private String normalizeCurrency(String currency, BigDecimal priceAmount) {
        if (priceAmount == null) return currency;
        String c = currency != null ? currency.trim().toLowerCase() : "";
        return (c.equals("usd") || c.equals("inr")) ? c : "inr";
    }

    private void enrichWithSellerNames(List<MarketplaceListing> listings) {
        Map<Long, User> userMap = userRepo.findAll().stream()
                .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));
        for (MarketplaceListing listing : listings) {
            if (listing.getUserId() != null && userMap.containsKey(listing.getUserId())) {
                User u = userMap.get(listing.getUserId());
                String name = (u.getDisplayName() != null && !u.getDisplayName().isEmpty())
                        ? u.getDisplayName()
                        : ((u.getFirstName() != null ? u.getFirstName() : "")
                        + (u.getLastName() != null ? " " + u.getLastName() : "")).trim();
                listing.setSellerName(name);
            }
        }
    }
}
