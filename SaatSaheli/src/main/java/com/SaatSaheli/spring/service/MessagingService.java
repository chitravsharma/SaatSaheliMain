package com.SaatSaheli.spring.service;

import com.SaatSaheli.spring.model.*;
import com.SaatSaheli.spring.repository.*;
import com.SaatSaheli.spring.util.PlanLimits;
import com.SaatSaheli.spring.util.RoleUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Private buyer ↔ seller messaging about items For Sale. Any logged-in member may
 * contact a seller; only the seller side needs a plan that includes selling
 * (an item is only For Sale while its owner's plan allows it).
 *
 * Access: the two participants read + write; ADMIN/SUPER_ADMIN read every thread
 * (and may close one) but never write into it. Nothing is real-time — the client
 * polls {@code ?after=<lastId>} every few seconds, like the public chat rooms.
 */
@Service
public class MessagingService {

    private static final Logger log = LoggerFactory.getLogger(MessagingService.class);

    public static final int MAX_BODY = 2000;
    @Autowired private ConversationRepository convRepo;
    @Autowired private ConversationMessageRepository msgRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private GalleryRepository galleryRepo;
    @Autowired private GalleryImageRepository galleryImageRepo;
    @Autowired private MessagingNotifier notifier;

    // ── Eligibility ──────────────────────────────────────────────────────────

    public boolean isAdmin(User u) { return u != null && RoleUtil.isAdmin(u.getRole()); }

    /** Seller side: Premium/Creator (or admin) may have items For Sale and receive enquiries. */
    public boolean canUseMessaging(User u) {
        return u != null && (isAdmin(u) || PlanLimits.forPlan(u.getPlan()).canUseMarketChat);
    }

    /** Show the inbox/envelope to sellers, admins, and anyone who already has a thread. */
    public boolean isEligible(Long userId) {
        User u = userId == null ? null : userRepo.findById(userId).orElse(null);
        if (u == null) return false;
        return canUseMessaging(u) || !convRepo.findMine(userId).isEmpty();
    }

    /** Any logged-in member can message. */
    private User requireMessagingUser(Long userId) {
        User u = userId == null ? null : userRepo.findById(userId).orElse(null);
        if (u == null) throw new IllegalStateException("Authentication required");
        return u;
    }

    private boolean isParticipant(Conversation c, Long userId) {
        return userId != null && (userId.equals(c.getSellerId()) || userId.equals(c.getBuyerId()));
    }

    private Conversation requireReadable(Long convId, User u) {
        Conversation c = convRepo.findById(convId).orElseThrow(() -> new NoSuchElementException("Conversation not found"));
        if (!isParticipant(c, u.getId()) && !isAdmin(u)) throw new SecurityException("Not your conversation");
        return c;
    }

    // ── Start / list ─────────────────────────────────────────────────────────

    /** Buyer opens (or re-opens) the thread about an item. Idempotent per (seller, buyer, item). */
    @Transactional
    public Conversation startForItem(Long buyerId, String targetType, Long targetId) {
        User buyer = requireMessagingUser(buyerId);
        if (!"GALLERY_IMAGE".equalsIgnoreCase(targetType)) {
            throw new IllegalArgumentException("Only gallery items can be enquired about right now");
        }
        GalleryImage img = galleryImageRepo.findById(targetId).orElseThrow(() -> new NoSuchElementException("Item not found"));
        Gallery gallery = galleryRepo.findById(img.getGalleryId()).orElseThrow(() -> new NoSuchElementException("Gallery not found"));
        Long sellerId = gallery.getUserId();
        if (sellerId == null) throw new NoSuchElementException("This item has no seller");
        if (sellerId.equals(buyerId)) throw new IllegalArgumentException("That's your own item");
        User seller = userRepo.findById(sellerId).orElseThrow(() -> new NoSuchElementException("Seller not found"));
        if (!img.isForSale() || !canUseMessaging(seller)) {
            throw new IllegalArgumentException("This item is not currently for sale");
        }

        Optional<Conversation> existing = convRepo.findBySellerIdAndBuyerIdAndTargetTypeAndTargetId(
                sellerId, buyerId, "GALLERY_IMAGE", targetId);
        Conversation c = existing.orElseGet(() -> {
            Conversation n = new Conversation();
            n.setSellerId(sellerId);
            n.setBuyerId(buyerId);
            n.setTargetType("GALLERY_IMAGE");
            n.setTargetId(targetId);
            n.setStatus("OPEN");
            n.setCreatedDate(LocalDateTime.now());
            return n;
        });
        // Refresh the denormalised item summary each time it's opened.
        String title = img.getCaption() != null && !img.getCaption().isBlank() ? img.getCaption() : gallery.getTitle();
        c.setItemTitle(title);
        c.setItemImageUrl(img.getImageUrl());
        c.setItemLink("/gallery/" + gallery.getId() + "?img=" + img.getId());
        if (c.getStatus() == null) c.setStatus("OPEN");
        c = convRepo.save(c);
        decorate(c, buyer);
        return c;
    }

    public List<Conversation> listMine(Long userId) {
        User u = requireMessagingUser(userId);
        List<Conversation> list = convRepo.findMine(userId);
        list.forEach(c -> decorate(c, u));
        return list;
    }

    public long unreadCount(Long userId) {
        if (userId == null) return 0;
        return convRepo.unreadFor(userId);
    }

    public Conversation get(Long convId, Long userId) {
        User u = requireMessagingUser(userId);
        Conversation c = requireReadable(convId, u);
        decorate(c, u);
        return c;
    }

    // ── Messages ─────────────────────────────────────────────────────────────

    public List<ConversationMessage> messages(Long convId, Long userId, Long afterId) {
        User u = requireMessagingUser(userId);
        requireReadable(convId, u);
        List<ConversationMessage> list = afterId == null || afterId <= 0
                ? msgRepo.findByConversationIdOrderByIdAsc(convId)
                : msgRepo.findByConversationIdAndIdGreaterThanOrderByIdAsc(convId, afterId);
        list.forEach(m -> { if (m.isDeleted()) m.setBody(""); });
        return list;
    }

    @Transactional
    public ConversationMessage send(Long convId, Long senderId, String rawBody) {
        User sender = requireMessagingUser(senderId);
        Conversation c = convRepo.findById(convId).orElseThrow(() -> new NoSuchElementException("Conversation not found"));
        if (!isParticipant(c, senderId)) throw new SecurityException("Only the buyer and seller can write here");
        if ("CLOSED".equalsIgnoreCase(c.getStatus())) throw new IllegalStateException("This conversation is closed");
        String body = rawBody == null ? "" : rawBody.trim();
        if (body.isEmpty()) throw new IllegalArgumentException("Message is empty");
        if (body.length() > MAX_BODY) body = body.substring(0, MAX_BODY);

        ConversationMessage m = new ConversationMessage();
        m.setConversationId(convId);
        m.setSenderId(senderId);
        m.setSenderName(displayName(sender));
        m.setBody(body);
        m.setCreatedDate(LocalDateTime.now());
        m = msgRepo.save(m);

        boolean senderIsSeller = senderId.equals(c.getSellerId());
        Long recipientId = senderIsSeller ? c.getBuyerId() : c.getSellerId();
        if (senderIsSeller) c.setBuyerUnread(c.getBuyerUnread() + 1); else c.setSellerUnread(c.getSellerUnread() + 1);
        c.setLastPreview(body.length() > 160 ? body.substring(0, 160) + "…" : body);
        c.setLastSenderId(senderId);
        c.setLastMessageAt(m.getCreatedDate());
        convRepo.save(c);

        notifier.notifyRecipient(c, m, recipientId, senderIsSeller);
        return m;
    }

    @Transactional
    public void markRead(Long convId, Long userId) {
        User u = requireMessagingUser(userId);
        Conversation c = requireReadable(convId, u);
        if (userId.equals(c.getSellerId())) c.setSellerUnread(0);
        else if (userId.equals(c.getBuyerId())) c.setBuyerUnread(0);
        else return;
        convRepo.save(c);
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    public List<Conversation> listAll() {
        List<Conversation> list = convRepo.findAllByOrderByLastMessageAtDesc();
        list.forEach(c -> decorate(c, null));
        return list;
    }

    @Transactional
    public Conversation setStatus(Long convId, String status) {
        Conversation c = convRepo.findById(convId).orElseThrow(() -> new NoSuchElementException("Conversation not found"));
        c.setStatus("CLOSED".equalsIgnoreCase(status) ? "CLOSED" : "OPEN");
        return convRepo.save(c);
    }

    public long messageCount(Long convId) { return msgRepo.countByConversationId(convId); }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void decorate(Conversation c, User viewer) {
        userRepo.findById(c.getSellerId()).ifPresent(s -> { c.setSellerName(displayName(s)); c.setSellerHandle(s.getHandle()); });
        userRepo.findById(c.getBuyerId()).ifPresent(b -> { c.setBuyerName(displayName(b)); c.setBuyerHandle(b.getHandle()); });
    }

    static String displayName(User u) {
        if (u == null) return "Member";
        if (u.getDisplayName() != null && !u.getDisplayName().isBlank()) return u.getDisplayName();
        String n = ((u.getFirstName() == null ? "" : u.getFirstName()) + " " + (u.getLastName() == null ? "" : u.getLastName())).trim();
        return n.isEmpty() ? "Member" : n;
    }
}
