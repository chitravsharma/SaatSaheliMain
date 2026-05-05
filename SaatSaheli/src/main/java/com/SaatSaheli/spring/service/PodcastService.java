package com.SaatSaheli.spring.service;

import com.SaatSaheli.spring.model.Podcast;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.PodcastRepository;
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
public class PodcastService {

    private static final Logger log = LoggerFactory.getLogger(PodcastService.class);

    @Autowired
    private PodcastRepository podcastRepo;

    @Autowired
    private UserRepository userRepo;

    public Podcast createPodcast(Long userId, String title, String description, String audioUrl,
                                  String youtubeUrl, String coverImageUrl, String language, String category, String status, Integer durationSeconds) {
        LocalDateTime now = LocalDateTime.now();
        Podcast podcast = new Podcast();
        podcast.setUserId(userId);
        podcast.setTitle(title);
        podcast.setDescription(description);
        podcast.setAudioUrl(audioUrl);
        podcast.setYoutubeUrl(youtubeUrl);
        podcast.setCoverImageUrl(coverImageUrl);
        podcast.setLanguage(language != null ? language : "Hindi");
        podcast.setCategory(category);
        podcast.setStatus(status != null ? status.toUpperCase() : "PUBLISHED");
        podcast.setDurationSeconds(durationSeconds);
        podcast.setCreatedDate(now);
        podcast.setModifiedDate(now);
        return podcastRepo.save(podcast);
    }

    public Podcast updatePodcast(Long podcastId, Long userId, String title, String description,
                                  String audioUrl, String youtubeUrl, String coverImageUrl, String language, String category, String status, Integer durationSeconds) {
        Optional<Podcast> opt = podcastRepo.findById(podcastId);
        if (opt.isEmpty()) throw new RuntimeException("Podcast not found");
        Podcast podcast = opt.get();
        if (title != null) podcast.setTitle(title);
        if (description != null) podcast.setDescription(description);
        if (audioUrl != null) podcast.setAudioUrl(audioUrl);
        if (youtubeUrl != null) podcast.setYoutubeUrl(youtubeUrl);
        if (coverImageUrl != null) podcast.setCoverImageUrl(coverImageUrl);
        if (language != null) podcast.setLanguage(language);
        if (category != null) podcast.setCategory(category);
        if (status != null) podcast.setStatus(status.toUpperCase());
        if (durationSeconds != null) podcast.setDurationSeconds(durationSeconds);
        podcast.setModifiedDate(LocalDateTime.now());
        return podcastRepo.save(podcast);
    }

    public void deletePodcast(Long podcastId, Long userId) {
        Optional<Podcast> opt = podcastRepo.findById(podcastId);
        if (opt.isEmpty()) throw new RuntimeException("Podcast not found");
        podcastRepo.deleteById(podcastId);
    }

    public List<Podcast> getPodcastsByUser(Long userId) {
        return podcastRepo.findByUserIdOrderByCreatedDateDesc(userId);
    }

    public List<Podcast> getAllPodcasts() {
        List<Podcast> podcasts = podcastRepo.findByStatusOrderByCreatedDateDesc("PUBLISHED");
        enrichWithAuthorNames(podcasts);
        return podcasts;
    }

    public List<Podcast> getPodcastsByLanguage(String language) {
        List<Podcast> podcasts = podcastRepo.findByLanguageAndStatusOrderByCreatedDateDesc(language, "PUBLISHED");
        enrichWithAuthorNames(podcasts);
        return podcasts;
    }

    public List<Podcast> getPodcastsByCategory(String category) {
        List<Podcast> podcasts = podcastRepo.findByCategoryAndStatusOrderByCreatedDateDesc(category, "PUBLISHED");
        enrichWithAuthorNames(podcasts);
        return podcasts;
    }

    public Podcast getPodcast(Long id) {
        Optional<Podcast> opt = podcastRepo.findById(id);
        if (opt.isEmpty()) throw new RuntimeException("Podcast not found");
        return opt.get();
    }

    private void enrichWithAuthorNames(List<Podcast> podcasts) {
        Map<Long, User> userMap = userRepo.findAll().stream()
                .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));
        for (Podcast podcast : podcasts) {
            if (podcast.getUserId() != null && userMap.containsKey(podcast.getUserId())) {
                User u = userMap.get(podcast.getUserId());
                String name = (u.getDisplayName() != null && !u.getDisplayName().isEmpty())
                        ? u.getDisplayName()
                        : ((u.getFirstName() != null ? u.getFirstName() : "")
                        + (u.getLastName() != null ? " " + u.getLastName() : "")).trim();
                podcast.setAuthorName(name);
            }
        }
    }
}
