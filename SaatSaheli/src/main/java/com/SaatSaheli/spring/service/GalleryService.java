package com.SaatSaheli.spring.service;

import com.SaatSaheli.spring.model.Gallery;
import com.SaatSaheli.spring.model.GalleryImage;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.CommentRepository;
import com.SaatSaheli.spring.repository.ContentLikeRepository;
import com.SaatSaheli.spring.repository.GalleryImageRepository;
import com.SaatSaheli.spring.repository.GalleryRepository;
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
public class GalleryService {

    @Autowired
    private GalleryRepository galleryRepo;

    @Autowired
    private GalleryImageRepository imageRepo;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private ContentLikeRepository likeRepo;

    @Autowired
    private CommentRepository commentRepo;

    @Transactional
    public Gallery createGallery(String title, String description, Long userId, String status) {
        LocalDateTime now = LocalDateTime.now();
        Gallery gallery = new Gallery();
        gallery.setTitle(title);
        gallery.setDescription(description);
        gallery.setUserId(userId);
        gallery.setStatus(normalizeStatus(status, "DRAFT"));
        gallery.setCreatedDate(now);
        gallery.setModifiedDate(now);
        return galleryRepo.save(gallery);
    }

    /** Normalize a user-supplied status to DRAFT or PUBLISHED. Falls back to {@code fallback} for unrecognized values. */
    private String normalizeStatus(String s, String fallback) {
        if (s == null) return fallback;
        String up = s.trim().toUpperCase();
        return ("PUBLISHED".equals(up) || "DRAFT".equals(up)) ? up : fallback;
    }

    public Gallery getGallery(Long id) {
        Optional<Gallery> opt = galleryRepo.findById(id);
        if (opt.isEmpty()) throw new RuntimeException("Gallery not found");
        Gallery gallery = opt.get();
        gallery.setImages(imageRepo.findByGalleryIdOrderByOrderIndexAsc(id));
        enrichWithAuthor(gallery);
        enrichWithCounts(gallery);
        return gallery;
    }

    public List<Gallery> getPublishedGalleries() {
        List<Gallery> galleries = galleryRepo.findByStatusIgnoreCase("PUBLISHED");
        Map<Long, User> userMap = getUserMap();
        for (Gallery g : galleries) {
            g.setImages(imageRepo.findByGalleryIdOrderByOrderIndexAsc(g.getId()));
            if (g.getUserId() != null && userMap.containsKey(g.getUserId())) {
                User u = userMap.get(g.getUserId());
                g.setAuthorName(buildName(u));
            }
            enrichWithCounts(g);
        }
        return galleries;
    }

    public List<Gallery> getGalleriesByUser(Long userId) {
        List<Gallery> galleries = galleryRepo.findByUserId(userId);
        for (Gallery g : galleries) {
            g.setImages(imageRepo.findByGalleryIdOrderByOrderIndexAsc(g.getId()));
            enrichWithCounts(g);
        }
        return galleries;
    }

    public Gallery updateGallery(Long id, String title, String description, String status, Long requestUserId) {
        Optional<Gallery> opt = galleryRepo.findById(id);
        if (opt.isEmpty()) throw new RuntimeException("Gallery not found");
        Gallery gallery = opt.get();
        if (requestUserId != null && !requestUserId.equals(gallery.getUserId())) {
            throw new RuntimeException("Only the owner can edit this gallery");
        }
        if (title != null) gallery.setTitle(title);
        if (description != null) gallery.setDescription(description);
        if (status != null) gallery.setStatus(normalizeStatus(status, gallery.getStatus()));
        gallery.setModifiedDate(LocalDateTime.now());
        return galleryRepo.save(gallery);
    }

    public void deleteGallery(Long id, Long requestUserId) {
        Optional<Gallery> opt = galleryRepo.findById(id);
        if (opt.isEmpty()) return;
        Gallery gallery = opt.get();
        if (requestUserId != null && !requestUserId.equals(gallery.getUserId())) {
            throw new RuntimeException("Only the owner can delete this gallery");
        }
        gallery.setStatus("DELETED");
        gallery.setModifiedDate(LocalDateTime.now());
        galleryRepo.save(gallery);
    }

    @Transactional
    public GalleryImage addImage(Long galleryId, String imageUrl, String caption, Long requestUserId) {
        Optional<Gallery> opt = galleryRepo.findById(galleryId);
        if (opt.isEmpty()) throw new RuntimeException("Gallery not found");
        Gallery gallery = opt.get();
        if (requestUserId != null && !requestUserId.equals(gallery.getUserId())) {
            throw new RuntimeException("Only the owner can add images");
        }
        List<GalleryImage> existing = imageRepo.findByGalleryIdOrderByOrderIndexAsc(galleryId);
        int nextIndex = existing.isEmpty() ? 0 : existing.get(existing.size() - 1).getOrderIndex() + 1;

        GalleryImage img = new GalleryImage();
        img.setGalleryId(galleryId);
        img.setImageUrl(imageUrl);
        img.setCaption(caption);
        img.setOrderIndex(nextIndex);
        img.setCreatedDate(LocalDateTime.now());
        GalleryImage saved = imageRepo.save(img);

        // Set cover image if this is the first image.
        if (gallery.getCoverImageUrl() == null) {
            gallery.setCoverImageUrl(imageUrl);
        }
        // Bump modifiedDate on EVERY image add (not just the first) so a gallery
        // that gains a new item surfaces first on the home page, which sorts
        // galleries by modifiedDate descending.
        gallery.setModifiedDate(LocalDateTime.now());
        galleryRepo.save(gallery);
        return saved;
    }

    public void removeImage(Long imageId, Long requestUserId) {
        Optional<GalleryImage> opt = imageRepo.findById(imageId);
        if (opt.isEmpty()) return;
        GalleryImage img = opt.get();
        Optional<Gallery> galleryOpt = galleryRepo.findById(img.getGalleryId());
        if (galleryOpt.isPresent() && requestUserId != null && !requestUserId.equals(galleryOpt.get().getUserId())) {
            throw new RuntimeException("Only the owner can remove images");
        }
        imageRepo.deleteById(imageId);
    }

    public GalleryImage updateImageCaption(Long imageId, String caption, Long requestUserId) {
        Optional<GalleryImage> opt = imageRepo.findById(imageId);
        if (opt.isEmpty()) throw new RuntimeException("Image not found");
        GalleryImage img = opt.get();
        Optional<Gallery> galleryOpt = galleryRepo.findById(img.getGalleryId());
        if (galleryOpt.isPresent() && requestUserId != null && !requestUserId.equals(galleryOpt.get().getUserId())) {
            throw new RuntimeException("Only the owner can edit captions");
        }
        img.setCaption(caption);
        return imageRepo.save(img);
    }

    private void enrichWithAuthor(Gallery gallery) {
        if (gallery.getUserId() != null) {
            Optional<User> userOpt = userRepo.findById(gallery.getUserId());
            userOpt.ifPresent(u -> gallery.setAuthorName(buildName(u)));
        }
    }

    private void enrichWithCounts(Gallery gallery) {
        gallery.setLikeCount(likeRepo.countByTargetTypeAndTargetId("GALLERY", gallery.getId()));
        gallery.setCommentCount(commentRepo.countByTargetTypeAndTargetIdAndIsDeletedFalse("GALLERY", gallery.getId()));
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
