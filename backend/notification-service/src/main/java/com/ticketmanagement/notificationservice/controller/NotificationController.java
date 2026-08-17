package com.ticketmanagement.notificationservice.controller;

import com.ticketmanagement.notificationservice.config.SseEmitterRegistry;
import com.ticketmanagement.notificationservice.dto.NotificationResponseDTO;
import com.ticketmanagement.notificationservice.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {
    private final NotificationService notificationService;
    private final SseEmitterRegistry sseEmitterRegistry;

    @GetMapping
    public ResponseEntity<List<NotificationResponseDTO>> getNotifications(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        log.info("NotificationController.getNotifications called with X-User-Id={} AuthorizationPresent={}", userIdHeader, authorizationHeader != null);
        if (userIdHeader == null || userIdHeader.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        UUID userId = UUID.fromString(userIdHeader);
        List<NotificationResponseDTO> notifications = notificationService.getNotificationsForUser(userId);
        log.info("Returning {} notifications for userId={}", notifications.size(), userId);
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @RequestHeader("X-User-Id") String userIdHeader
    ) {
        UUID userId = UUID.fromString(userIdHeader);
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(userId)));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationResponseDTO> markAsRead(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String userIdHeader
    ) {
        UUID userId = UUID.fromString(userIdHeader);
        return ResponseEntity.ok(notificationService.markAsRead(id, userId));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(
            @RequestHeader("X-User-Id") String userIdHeader
    ) {
        UUID userId = UUID.fromString(userIdHeader);
        notificationService.markAllAsRead(userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamNotifications(
            @RequestHeader("X-User-Id") String userIdHeader
    ) {
        UUID userId = UUID.fromString(userIdHeader);
        log.info("NotificationController.streamNotifications opened SSE for userId={}", userId);
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE); // No timeout
        sseEmitterRegistry.addEmitter(userId, emitter);
        return emitter;
    }
}
