package com.ticketmanagement.assignmentservice.client;

import com.ticketmanagement.assignmentservice.dto.CreateNotificationRequestDTO;
import com.ticketmanagement.assignmentservice.dto.SendEmailRequestDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@Slf4j
public class NotificationClient {

    private final RestClient restClient;

    public NotificationClient(
            @Value("${notification.service.url}") String notificationServiceUrl,
            @Value("${internal.service-secret}") String internalServiceSecret
    ) {
        this.restClient = RestClient.builder()
                .baseUrl(notificationServiceUrl)
                .defaultHeader("X-Internal-Service-Key", internalServiceSecret)
                .build();
    }

    public void createNotification(CreateNotificationRequestDTO request) {
        try {
            log.info("AssignmentService.NotificationClient.createNotification -> POST /internal/notifications payload={}", request);
            restClient.post()
                    .uri("/internal/notifications")
                    .body(request)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Notification created successfully for user {}", request.getUserId());
        } catch (Exception e) {
            log.error("Failed to create notification: {}", e.getMessage(), e);
            throw e;
        }
    }

    public void sendEmail(SendEmailRequestDTO request) {
        try {
            log.info("AssignmentService.NotificationClient.sendEmail -> POST /internal/notifications/email payload={}", request);
            restClient.post()
                    .uri("/internal/notifications/email")
                    .body(request)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Email sent successfully to {}", request.getTo());
        } catch (Exception e) {
            log.error("Failed to send email: {}", e.getMessage(), e);
            throw e;
        }
    }
}
