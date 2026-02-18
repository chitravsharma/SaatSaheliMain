package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.model.ChatMessage;
import com.SaatSaheli.spring.model.ChatRoom;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.ChatMessageRepository;
import com.SaatSaheli.spring.repository.ChatRoomRepository;
import com.SaatSaheli.spring.repository.UserRepository;
import com.SaatSaheli.spring.util.RoleUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*")
public class ChatController {

    private static final DateTimeFormatter DTF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private static final String[][] DEFAULT_ROOMS = {
            {"Art", "Art", "Discuss visual arts, painting, drawing, and more"},
            {"Music", "Music", "Share and discuss music, instruments, and compositions"},
            {"Writing", "Writing", "Talk about creative writing, poetry, and storytelling"},
            {"Tech", "Tech", "Discuss technology, coding, and digital creation"},
            {"Creativity", "Creativity", "General creativity discussions and inspiration"},
            {"Community", "Community", "Community announcements and general discussion"}
    };

    @Autowired
    private ChatRoomRepository roomRepo;

    @Autowired
    private ChatMessageRepository messageRepo;

    @Autowired
    private UserRepository userRepo;

    /** GET /api/chat/rooms — List all chat rooms (auto-init if empty) */
    @GetMapping("/rooms")
    public ResponseEntity<?> listRooms(@RequestHeader("X-User-Id") String callerUserId) {
        try {
            List<ChatRoom> rooms = roomRepo.findAll();
            if (rooms.isEmpty()) {
                rooms = initializeDefaultRooms();
            }
            return ResponseEntity.ok(rooms);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to list rooms: " + e.getMessage()));
        }
    }

    /** GET /api/chat/rooms/{roomId}/messages?afterId=&limit=50 */
    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<?> getMessages(
            @PathVariable Long roomId,
            @RequestParam(required = false) Long afterId,
            @RequestParam(defaultValue = "50") int limit,
            @RequestHeader("X-User-Id") String callerUserId) {
        try {
            List<ChatMessage> messages = messageRepo.findByRoomIdAfter(roomId, afterId);
            // Filter out deleted messages (show placeholder instead)
            List<Map<String, Object>> result = messages.stream()
                    .sorted(Comparator.comparingLong(ChatMessage::getId))
                    .limit(limit)
                    .map(m -> {
                        Map<String, Object> entry = new LinkedHashMap<>();
                        entry.put("id", m.getId());
                        entry.put("roomId", m.getRoomId());
                        entry.put("senderId", m.getSenderId());
                        entry.put("senderName", m.getSenderName());
                        entry.put("message", m.getIsDeleted() ? "[deleted]" : m.getMessage());
                        entry.put("createdDate", m.getCreatedDate());
                        entry.put("isDeleted", m.getIsDeleted());
                        return entry;
                    })
                    .collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to get messages: " + e.getMessage()));
        }
    }

    /** POST /api/chat/rooms/{roomId}/messages — Send a message */
    @PostMapping("/rooms/{roomId}/messages")
    public ResponseEntity<?> sendMessage(
            @PathVariable Long roomId,
            @RequestBody Map<String, String> body,
            @RequestHeader("X-User-Id") String callerUserId) {
        try {
            String text = body.get("message");
            if (text == null || text.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("Message cannot be empty"));
            }

            Long userId = Long.parseLong(callerUserId);
            Optional<User> userOpt = userRepo.findById(userId);
            String senderName = "Unknown";
            if (userOpt.isPresent()) {
                User u = userOpt.get();
                senderName = ((u.getFirstName() != null ? u.getFirstName() : "")
                        + (u.getLastName() != null ? " " + u.getLastName() : "")).trim();
                if (senderName.isEmpty()) senderName = u.getEmail();
            }

            ChatMessage msg = new ChatMessage();
            msg.setRoomId(roomId);
            msg.setSenderId(userId);
            msg.setSenderName(senderName);
            msg.setMessage(text.trim());
            msg.setCreatedDate(LocalDateTime.now().format(DTF));
            msg.setIsDeleted(false);
            msg = messageRepo.save(msg);

            return ResponseEntity.ok(msg);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to send message: " + e.getMessage()));
        }
    }

    /** DELETE /api/chat/messages/{messageId} — Soft-delete (own msg or admin) */
    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<?> deleteMessage(
            @PathVariable Long messageId,
            @RequestHeader("X-User-Id") String callerUserId) {
        try {
            Long userId = Long.parseLong(callerUserId);
            Optional<ChatMessage> msgOpt = messageRepo.findById(messageId);
            if (msgOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap("Message not found"));
            }

            ChatMessage msg = msgOpt.get();

            // Check: must be sender or admin
            boolean isSender = userId.equals(msg.getSenderId());
            boolean isAdminUser = false;
            Optional<User> userOpt = userRepo.findById(userId);
            if (userOpt.isPresent()) {
                isAdminUser = RoleUtil.isAdmin(userOpt.get().getRole());
            }

            if (!isSender && !isAdminUser) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(errorMap("You can only delete your own messages"));
            }

            msg.setIsDeleted(true);
            messageRepo.save(msg);

            return ResponseEntity.ok(Map.of("message", "Message deleted"));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to delete message: " + e.getMessage()));
        }
    }

    private List<ChatRoom> initializeDefaultRooms() throws IOException {
        String now = LocalDateTime.now().format(DTF);
        List<ChatRoom> rooms = new ArrayList<>();
        for (int i = 0; i < DEFAULT_ROOMS.length; i++) {
            ChatRoom room = new ChatRoom();
            room.setId((long) (i + 1));
            room.setName(DEFAULT_ROOMS[i][0]);
            room.setCategory(DEFAULT_ROOMS[i][1]);
            room.setDescription(DEFAULT_ROOMS[i][2]);
            room.setCreatedDate(now);
            room.setModifiedDate(now);
            roomRepo.save(room);
            rooms.add(room);
        }
        return rooms;
    }

    private Map<String, String> errorMap(String message) {
        Map<String, String> map = new HashMap<>();
        map.put("error", message);
        return map;
    }
}
