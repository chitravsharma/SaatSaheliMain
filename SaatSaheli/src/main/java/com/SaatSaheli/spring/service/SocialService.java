package com.SaatSaheli.spring.service;

import com.SaatSaheli.spring.model.Comment;
import com.SaatSaheli.spring.model.ContentLike;
import com.SaatSaheli.spring.model.Favorite;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.CommentRepository;
import com.SaatSaheli.spring.repository.ContentLikeRepository;
import com.SaatSaheli.spring.repository.FavoriteRepository;
import com.SaatSaheli.spring.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class SocialService {

    @Autowired
    private ContentLikeRepository likeRepo;

    @Autowired
    private CommentRepository commentRepo;

    @Autowired
    private FavoriteRepository favoriteRepo;

    @Autowired
    private UserRepository userRepo;

    // ── Likes ──

    @Transactional
    public Map<String, Object> toggleLike(Long userId, String targetType, Long targetId) {
        Optional<ContentLike> existing = likeRepo.findByUserIdAndTargetTypeAndTargetId(userId, targetType, targetId);
        boolean liked;
        if (existing.isPresent()) {
            likeRepo.delete(existing.get());
            liked = false;
        } else {
            ContentLike like = new ContentLike();
            like.setUserId(userId);
            like.setTargetType(targetType);
            like.setTargetId(targetId);
            like.setCreatedDate(LocalDateTime.now());
            likeRepo.save(like);
            liked = true;
        }
        int count = likeRepo.countByTargetTypeAndTargetId(targetType, targetId);
        Map<String, Object> result = new HashMap<>();
        result.put("liked", liked);
        result.put("count", count);
        return result;
    }

    public Map<String, Object> getLikeStatus(Long userId, String targetType, Long targetId) {
        boolean liked = userId != null && likeRepo.findByUserIdAndTargetTypeAndTargetId(userId, targetType, targetId).isPresent();
        int count = likeRepo.countByTargetTypeAndTargetId(targetType, targetId);
        Map<String, Object> result = new HashMap<>();
        result.put("liked", liked);
        result.put("count", count);
        return result;
    }

    // ── Comments ──

    public Comment addComment(Long userId, String targetType, Long targetId, String content) {
        Optional<User> userOpt = userRepo.findById(userId);
        String userName = userOpt.map(u -> {
            if (u.getDisplayName() != null && !u.getDisplayName().isEmpty()) return u.getDisplayName();
            return ((u.getFirstName() != null ? u.getFirstName() : "") +
                    (u.getLastName() != null ? " " + u.getLastName() : "")).trim();
        }).orElse("Anonymous");

        Comment comment = new Comment();
        comment.setUserId(userId);
        comment.setUserName(userName);
        comment.setTargetType(targetType);
        comment.setTargetId(targetId);
        comment.setContent(content);
        comment.setCreatedDate(LocalDateTime.now());
        return commentRepo.save(comment);
    }

    public List<Comment> getComments(String targetType, Long targetId) {
        return commentRepo.findByTargetTypeAndTargetIdOrderByCreatedDateDesc(targetType, targetId)
                .stream()
                .filter(c -> !c.isDeleted())
                .collect(Collectors.toList());
    }

    public void deleteComment(Long commentId, Long requestUserId) {
        Optional<Comment> opt = commentRepo.findById(commentId);
        if (opt.isEmpty()) return;
        Comment comment = opt.get();
        if (!comment.getUserId().equals(requestUserId)) {
            throw new RuntimeException("Only the comment author can delete this comment");
        }
        comment.setDeleted(true);
        commentRepo.save(comment);
    }

    // ── Favorites ──

    @Transactional
    public Map<String, Object> toggleFavorite(Long userId, String targetType, Long targetId) {
        Optional<Favorite> existing = favoriteRepo.findByUserIdAndTargetTypeAndTargetId(userId, targetType, targetId);
        boolean favorited;
        if (existing.isPresent()) {
            favoriteRepo.delete(existing.get());
            favorited = false;
        } else {
            Favorite fav = new Favorite();
            fav.setUserId(userId);
            fav.setTargetType(targetType);
            fav.setTargetId(targetId);
            fav.setCreatedDate(LocalDateTime.now());
            favoriteRepo.save(fav);
            favorited = true;
        }
        Map<String, Object> result = new HashMap<>();
        result.put("favorited", favorited);
        return result;
    }

    public Map<String, Object> getFavoriteStatus(Long userId, String targetType, Long targetId) {
        boolean favorited = userId != null && favoriteRepo.findByUserIdAndTargetTypeAndTargetId(userId, targetType, targetId).isPresent();
        Map<String, Object> result = new HashMap<>();
        result.put("favorited", favorited);
        return result;
    }

    public List<Favorite> getUserFavorites(Long userId, String targetType) {
        return favoriteRepo.findByUserIdAndTargetType(userId, targetType);
    }

    // ── Bulk counts for home page ──

    public Map<Long, Integer> getLikeCountsForType(String targetType) {
        List<ContentLike> allLikes = likeRepo.findAll().stream()
                .filter(l -> targetType.equals(l.getTargetType()))
                .collect(Collectors.toList());
        return allLikes.stream()
                .collect(Collectors.groupingBy(ContentLike::getTargetId, Collectors.summingInt(l -> 1)));
    }

    public Map<Long, Integer> getCommentCountsForType(String targetType) {
        List<Comment> allComments = commentRepo.findAll().stream()
                .filter(c -> targetType.equals(c.getTargetType()) && !c.isDeleted())
                .collect(Collectors.toList());
        return allComments.stream()
                .collect(Collectors.groupingBy(Comment::getTargetId, Collectors.summingInt(c -> 1)));
    }
}
