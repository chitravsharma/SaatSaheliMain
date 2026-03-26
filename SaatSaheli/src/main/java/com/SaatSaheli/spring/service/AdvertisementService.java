package com.SaatSaheli.spring.service;

import com.SaatSaheli.spring.model.Advertisement;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.AdvertisementRepository;
import com.SaatSaheli.spring.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class AdvertisementService {

    private static final Logger log = LoggerFactory.getLogger(AdvertisementService.class);

    @Autowired
    private AdvertisementRepository adRepo;

    @Autowired
    private UserRepository userRepo;

    public Advertisement createAdvertisement(Long userId, String title, String contentType,
                                              String htmlContent, String imageUrl, String linkUrl,
                                              String animation, Boolean active) {
        LocalDateTime now = LocalDateTime.now();
        Advertisement ad = new Advertisement();
        ad.setUserId(userId);
        ad.setTitle(title);
        ad.setContentType(contentType != null ? contentType : "text");
        ad.setHtmlContent(htmlContent);
        ad.setImageUrl(imageUrl);
        ad.setLinkUrl(linkUrl);
        ad.setAnimation(animation != null ? animation : "static");
        ad.setActive(active != null ? active : true);
        ad.setCreatedDate(now);
        ad.setModifiedDate(now);
        return adRepo.save(ad);
    }

    public Advertisement updateAdvertisement(Long adId, String title, String contentType,
                                              String htmlContent, String imageUrl, String linkUrl,
                                              String animation, Boolean active) {
        Optional<Advertisement> adOpt = adRepo.findById(adId);
        if (adOpt.isEmpty()) throw new RuntimeException("Advertisement not found");
        Advertisement ad = adOpt.get();
        if (title != null) ad.setTitle(title);
        if (contentType != null) ad.setContentType(contentType);
        if (htmlContent != null) ad.setHtmlContent(htmlContent);
        if (imageUrl != null) ad.setImageUrl(imageUrl);
        if (linkUrl != null) ad.setLinkUrl(linkUrl);
        if (animation != null) ad.setAnimation(animation);
        if (active != null) ad.setActive(active);
        ad.setModifiedDate(LocalDateTime.now());
        return adRepo.save(ad);
    }

    public void deleteAdvertisement(Long adId) {
        if (!adRepo.existsById(adId)) throw new RuntimeException("Advertisement not found");
        adRepo.deleteById(adId);
    }

    public Advertisement toggleActive(Long adId) {
        Optional<Advertisement> adOpt = adRepo.findById(adId);
        if (adOpt.isEmpty()) throw new RuntimeException("Advertisement not found");
        Advertisement ad = adOpt.get();
        ad.setActive(!Boolean.TRUE.equals(ad.getActive()));
        ad.setModifiedDate(LocalDateTime.now());
        return adRepo.save(ad);
    }

    public List<Advertisement> getActiveAdvertisements() {
        List<Advertisement> ads = adRepo.findByActiveTrueOrderByCreatedDateDesc();
        enrichWithCreatorNames(ads);
        return ads;
    }

    public List<Advertisement> getAllAdvertisements() {
        List<Advertisement> ads = adRepo.findAllByOrderByCreatedDateDesc();
        enrichWithCreatorNames(ads);
        return ads;
    }

    public Advertisement getAdvertisement(Long id) {
        Optional<Advertisement> adOpt = adRepo.findById(id);
        if (adOpt.isEmpty()) throw new RuntimeException("Advertisement not found");
        Advertisement ad = adOpt.get();
        enrichWithCreatorNames(List.of(ad));
        return ad;
    }

    private void enrichWithCreatorNames(List<Advertisement> ads) {
        Map<Long, User> userMap = userRepo.findAll().stream()
                .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));
        for (Advertisement ad : ads) {
            if (ad.getUserId() != null && userMap.containsKey(ad.getUserId())) {
                User u = userMap.get(ad.getUserId());
                String name = (u.getDisplayName() != null && !u.getDisplayName().isEmpty())
                        ? u.getDisplayName()
                        : ((u.getFirstName() != null ? u.getFirstName() : "")
                        + (u.getLastName() != null ? " " + u.getLastName() : "")).trim();
                ad.setCreatorName(name);
            }
        }
    }
}
