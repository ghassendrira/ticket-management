package com.ticketmanagement.assignmentservice.client;

import com.ticketmanagement.assignmentservice.dto.CreateNotificationRequestDTO;
import com.ticketmanagement.assignmentservice.dto.SendEmailRequestDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
@Slf4j
public class NotificationClient {

    private final RestClient restClient;
    private final String internalServiceSecret;

    public NotificationClient(
            @Value("${ticket.service.url:http://localhost:8081}") String ticketServiceUrl,
            @Value("${internal.service-secret}") String internalServiceSecret
    ) {
        this.internalServiceSecret = internalServiceSecret;
        this.restClient = RestClient.builder()
                .baseUrl(ticketServiceUrl)
                .defaultHeader("X-Internal-Service-Key", internalServiceSecret)
                .build();
    }

    public void createNotification(CreateNotificationRequestDTO request) {
        try {
            log.info("AssignmentService.NotificationClient.createNotification -> POST /api/notifications/internal/create payload={}", request);

            Map<String, Object> payload = new HashMap<>();
            payload.put("userId", request.getUserId().toString());
            payload.put("title", request.getTitle());
            payload.put("message", request.getMessage());
            payload.put("type", request.getType().name());
            if (request.getTicketId() != null) {
                payload.put("ticketId", request.getTicketId().toString());
            }
            if (request.getTeamId() != null) {
                payload.put("teamId", request.getTeamId().toString());
            }

            restClient.post()
                    .uri("/api/notifications/internal/create")
                    .body(payload)
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
