package com.ticketmanagement.notificationservice.service;

import com.ticketmanagement.notificationservice.config.SseEmitterRegistry;
import com.ticketmanagement.notificationservice.dto.CreateNotificationRequestDTO;
import com.ticketmanagement.notificationservice.dto.NotificationResponseDTO;
import com.ticketmanagement.notificationservice.entity.Notification;
import com.ticketmanagement.notificationservice.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final SseEmitterRegistry sseEmitterRegistry;

    public NotificationResponseDTO createNotification(CreateNotificationRequestDTO request) {
        log.info("NotificationService.createNotification called with request: {}", request);
        Notification notification = new Notification();
        notification.setUserId(request.getUserId());
        notification.setTitle(request.getTitle());
        notification.setMessage(request.getMessage());
        notification.setType(request.getType());
        notification.setTicketId(request.getTicketId());
        notification.setTeamId(request.getTeamId());
        Notification saved = notificationRepository.save(notification);
        log.info("Notification saved with id={} for user={}", saved.getId(), saved.getUserId());
        NotificationResponseDTO response = mapToResponse(saved);
        try {
            sseEmitterRegistry.sendNotification(saved.getUserId(), response);
        } catch (Exception e) {
            log.error("Failed to send SSE for notification {}: {}", saved.getId(), e.getMessage(), e);
        }
        return response;
    }

    public List<NotificationResponseDTO> getNotificationsForUser(UUID userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public Long getUnreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    public NotificationResponseDTO markAsRead(UUID notificationId, UUID userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        if (!notification.getUserId().equals(userId)) {
            throw new IllegalStateException("Unauthorized to modify this notification");
        }
        notification.setIsRead(true);
        return mapToResponse(notificationRepository.save(notification));
    }

    public void markAllAsRead(UUID userId) {
        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        notifications.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(notifications);
    }

    private NotificationResponseDTO mapToResponse(Notification n) {
        return new NotificationResponseDTO(
                n.getId(),
                n.getTitle(),
                n.getMessage(),
                n.getType(),
                n.getIsRead(),
                n.getCreatedAt(),
                n.getTicketId(),
                n.getTeamId()
        );
    }
}