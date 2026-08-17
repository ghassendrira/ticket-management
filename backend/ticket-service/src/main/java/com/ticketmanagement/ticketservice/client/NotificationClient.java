package com.ticketmanagement.ticketservice.client;

import com.ticketmanagement.ticketservice.dto.CreateNotificationRequestDTO;
import com.ticketmanagement.ticketservice.dto.SendEmailRequestDTO;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

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
            log.info("TicketService.NotificationClient.createNotification -> POST /internal/notifications payload={}", request);
            var authorizationHeader = getIncomingAuthorizationHeader();
            var requestSpec = restClient.post()
                    .uri("/internal/notifications");
            if (authorizationHeader != null) {
                requestSpec.headers(headers -> headers.set(HttpHeaders.AUTHORIZATION, authorizationHeader));
            }
            requestSpec.body(request)
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
            log.info("TicketService.NotificationClient.sendEmail -> POST /internal/notifications/email payload={}", request);
            var authorizationHeader = getIncomingAuthorizationHeader();
            var requestSpec = restClient.post()
                    .uri("/internal/notifications/email");
            if (authorizationHeader != null) {
                requestSpec.headers(headers -> headers.set(HttpHeaders.AUTHORIZATION, authorizationHeader));
            }
            requestSpec.body(request)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Email sent successfully to {}", request.getTo());
        } catch (Exception e) {
            log.error("Failed to send email: {}", e.getMessage(), e);
            throw e;
        }
    }

    private String getIncomingAuthorizationHeader() {
        RequestAttributes requestAttributes = RequestContextHolder.getRequestAttributes();
        if (!(requestAttributes instanceof ServletRequestAttributes servletRequestAttributes)) {
            return null;
        }
        HttpServletRequest request = servletRequestAttributes.getRequest();
        if (request == null) {
            return null;
        }
        String authorizationHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        return authorizationHeader != null && !authorizationHeader.isBlank() ? authorizationHeader : null;
    }
}