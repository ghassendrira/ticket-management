package com.ticketmanagement.assignmentservice.client;

import com.ticketmanagement.assignmentservice.dto.UserSummaryDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.UUID;

@Component
@Slf4j
public class AuthServiceClient {

    private final RestClient restClient;

    public AuthServiceClient(
            @Value("${auth.service.url}") String authServiceUrl,
            @Value("${internal.service-secret}") String internalServiceSecret
    ) {
        this.restClient = RestClient.builder()
                .baseUrl(authServiceUrl)
                .defaultHeader("X-Internal-Service-Key", internalServiceSecret)
                .build();
    }

    public UserSummaryDTO getUserById(String userId) {
        if (userId == null || userId.isBlank()) {
            return null;
        }

        try {
            return restClient.get()
                    .uri("/api/users/{id}", UUID.fromString(userId))
                    .retrieve()
                    .body(UserSummaryDTO.class);
        } catch (IllegalArgumentException e) {
            log.error("Invalid user id format for auth lookup: {}", userId);
            return null;
        } catch (RestClientException e) {
            log.error("Failed to fetch user {} from auth-service: {}", userId, e.getMessage());
            return null;
        }
    }

    public List<UserSummaryDTO> getUsersByRole(String role) {
        try {
            return restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/users")
                            .queryParam("role", role)
                            .build())
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {
                    });
        } catch (RestClientException e) {
            log.error("Failed to fetch users with role {} from auth-service: {}", role, e.getMessage());
            return List.of();
        }
    }
}