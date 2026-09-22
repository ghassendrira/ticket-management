package com.ticketmanagement.ticketservice.controller;

import com.ticketmanagement.ticketservice.entity.Notification;
import com.ticketmanagement.ticketservice.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final NotificationRepository notificationRepository;

    private final Map<UUID, List<SseEmitter>> userEmitters = new ConcurrentHashMap<>();

    @GetMapping
    public ResponseEntity<List<Notification>> getNotifications(
            @RequestHeader("X-User-Id") String userId
    ) {
        try {
            UUID uid = UUID.fromString(userId);
            List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(uid);
            return ResponseEntity.ok(notifications);
        } catch (Exception e) {
            return ResponseEntity.ok(List.of());
        }
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @RequestHeader("X-User-Id") String userId
    ) {
        try {
            UUID uid = UUID.fromString(userId);
            long count = notificationRepository.countByUserIdAndIsReadFalse(uid);
            return ResponseEntity.ok(Map.of("count", count));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("count", 0L));
        }
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Notification> markAsRead(
            @PathVariable String id,
            @RequestHeader("X-User-Id") String userId
    ) {
        try {
            UUID nid = UUID.fromString(id);
            Optional<Notification> opt = notificationRepository.findById(nid);
            if (opt.isPresent()) {
                Notification n = opt.get();
                n.setRead(true);
                notificationRepository.save(n);
                return ResponseEntity.ok(n);
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(
            @RequestHeader("X-User-Id") String userId
    ) {
        try {
            UUID uid = UUID.fromString(userId);
            List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(uid);
            for (Notification n : notifications) {
                if (!n.isRead()) {
                    n.setRead(true);
                }
            }
            notificationRepository.saveAll(notifications);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.ok().build();
        }
    }

    @PostMapping("/internal/create")
    public ResponseEntity<Notification> createNotification(
            @RequestBody NotificationCreateRequest request,
            @RequestHeader(value = "X-Internal-Service-Key", required = false) String internalKey
    ) {
        Notification notification = new Notification();
        notification.setUserId(request.getUserId());
        notification.setTitle(request.getTitle());
        notification.setMessage(request.getMessage());
        notification.setType(request.getType());
        notification.setTicketId(request.getTicketId());
        notification.setTeamId(request.getTeamId());
        notification.setRead(false);

        sendNotificationToUser(request.getUserId(), notification);

        return ResponseEntity.ok(notification);
    }

    public static class NotificationCreateRequest {
        private UUID userId;
        private String title;
        private String message;
        private String type;
        private UUID ticketId;
        private UUID teamId;

        public UUID getUserId() { return userId; }
        public void setUserId(UUID userId) { this.userId = userId; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public UUID getTicketId() { return ticketId; }
        public void setTicketId(UUID ticketId) { this.ticketId = ticketId; }
        public UUID getTeamId() { return teamId; }
        public void setTeamId(UUID teamId) { this.teamId = teamId; }
    }
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamNotifications(
            @RequestParam("token") String token,
            @RequestHeader(value = "X-User-Id", required = false) String userId
    ) {
        SseEmitter emitter = new SseEmitter(0L);
        UUID uid;
        try {
            uid = userId != null ? UUID.fromString(userId) : UUID.randomUUID();
        } catch (Exception e) {
            uid = UUID.randomUUID();
        }

        userEmitters.computeIfAbsent(uid, k -> new CopyOnWriteArrayList<>()).add(emitter);

        final SseEmitter finalEmitter = emitter;
        final UUID finalUid = uid;
        emitter.onCompletion(() -> removeEmitter(finalUid, finalEmitter));
        emitter.onTimeout(() -> removeEmitter(finalUid, finalEmitter));
        emitter.onError(e -> removeEmitter(finalUid, finalEmitter));

        try {
            finalEmitter.send(SseEmitter.event().name("connected").data("{\"status\":\"connected\"}"));
        } catch (IOException e) {
            removeEmitter(finalUid, finalEmitter);
        }

        return emitter;
    }

    public void sendNotificationToUser(UUID userId, Notification notification) {
        notificationRepository.save(notification);
        List<SseEmitter> emitters = userEmitters.get(userId);
        if (emitters != null) {
            List<SseEmitter> toRemove = new ArrayList<>();
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event().name("notification").data(notification));
                } catch (IOException e) {
                    toRemove.add(emitter);
                }
            }
            emitters.removeAll(toRemove);
        }
    }

    private void removeEmitter(UUID userId, SseEmitter emitter) {
        List<SseEmitter> emitters = userEmitters.get(userId);
        if (emitters != null) {
            emitters.remove(emitter);
        }
    }
}
