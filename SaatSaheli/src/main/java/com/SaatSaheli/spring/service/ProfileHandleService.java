package com.SaatSaheli.spring.service;

import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Public profile handles ("url ids"): saatsaheli.com/profile/{handle}.
 *
 * A handle is 2–40 chars of letters, digits and hyphens, unique case-insensitively,
 * and must contain at least one non-digit so the /profile/{key} route can tell a
 * handle from a legacy numeric user id. Generated from the creator's name
 * (Chitra Sharma → Chitra-Sharma; a clash becomes Chitra-Sharma2, -3, …) and
 * editable by the creator on the profile form.
 */
@Service
public class ProfileHandleService {

    private static final Logger log = LoggerFactory.getLogger(ProfileHandleService.class);

    public static final int MIN_LEN = 2;
    public static final int MAX_LEN = 40;
    private static final Pattern VALID = Pattern.compile("^[\\p{L}\\p{M}\\p{N}-]{" + MIN_LEN + "," + MAX_LEN + "}$");
    private static final Pattern ALL_DIGITS = Pattern.compile("^\\p{N}+$");

    @Autowired private UserRepository userRepo;

    /** True when the handle is well-formed (does not check uniqueness). */
    public boolean isValid(String handle) {
        return handle != null && VALID.matcher(handle).matches() && !ALL_DIGITS.matcher(handle).matches();
    }

    /** True when no OTHER user already owns this handle (case-insensitive). */
    public boolean isAvailable(String handle, Long forUserId) {
        if (handle == null) return false;
        Optional<User> owner = userRepo.findByHandleIgnoreCase(handle);
        return owner.isEmpty() || (forUserId != null && forUserId.equals(owner.get().getId()));
    }

    /** "Chitra  Sharma!" → "Chitra-Sharma". Empty when nothing usable remains. */
    public String slugify(String name) {
        if (name == null) return "";
        String s = Normalizer.normalize(name.trim(), Normalizer.Form.NFC)
                .replaceAll("[^\\p{L}\\p{M}\\p{N}\\s-]", "")
                .replaceAll("[\\s-]+", "-")
                .replaceAll("^-+|-+$", "");
        if (s.length() > MAX_LEN) s = s.substring(0, MAX_LEN).replaceAll("-+$", "");
        return s;
    }

    /** Best display name to derive a handle from: display name, else first + last. */
    public String nameOf(User u) {
        if (u.getDisplayName() != null && !u.getDisplayName().isBlank()) return u.getDisplayName();
        String first = u.getFirstName() == null ? "" : u.getFirstName();
        String last = u.getLastName() == null ? "" : u.getLastName();
        return (first + " " + last).trim();
    }

    /**
     * A unique handle for this user based on their name: the plain slug if free,
     * otherwise slug2, slug3, … Falls back to creator-{id} when the name yields
     * nothing usable (e.g. emoji-only). The user's own current handle counts as free.
     */
    public String generateUnique(User u) {
        String base = slugify(nameOf(u));
        if (base.length() < MIN_LEN || ALL_DIGITS.matcher(base).matches()) {
            base = "creator-" + (u.getId() == null ? System.currentTimeMillis() : u.getId());
        }
        if (isAvailable(base, u.getId())) return base;
        for (int i = 2; i < 10_000; i++) {
            String candidate = base + i;
            if (candidate.length() > MAX_LEN) {
                candidate = base.substring(0, MAX_LEN - String.valueOf(i).length()) + i;
            }
            if (isAvailable(candidate, u.getId())) return candidate;
        }
        return "creator-" + u.getId() + "-" + System.currentTimeMillis();
    }

    /** Give the user a handle if they have none. Returns true when one was assigned. */
    public boolean ensureHandle(User u) {
        if (u.getHandle() != null && !u.getHandle().isBlank()) return false;
        u.setHandle(generateUnique(u));
        return true;
    }

    /** One-time, idempotent: every existing user gets a handle on the first deploy. */
    @EventListener(ApplicationReadyEvent.class)
    public void backfillMissingHandles() {
        try {
            List<User> missing = userRepo.findByHandleIsNull();
            int assigned = 0;
            for (User u : missing) {
                if (ensureHandle(u)) {
                    userRepo.save(u);
                    assigned++;
                }
            }
            if (assigned > 0) log.info("Assigned profile handles to {} user(s) without one", assigned);
        } catch (Exception e) {
            log.error("Profile handle backfill failed: {}", e.getMessage(), e);
        }
    }
}
