package com.ticketmanagement.ticketservice.client;

import com.ticketmanagement.ticketservice.dto.UserSummaryDTO;
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
            @Value("${internal.service-secret}") String internalServiceSecret) {
        this.restClient = RestClient.builder()
                .baseUrl(authServiceUrl)
                .defaultHeader("X-Internal-Service-Key", internalServiceSecret)
                .build();
    }

    public UserSummaryDTO getUserById(UUID userId) {
        if (userId == null) {
            return null;
        }

        try {
            return restClient.get()
                    .uri("/api/users/{id}", userId)
                    .retrieve()
                    .body(UserSummaryDTO.class);
        } catch (RestClientException e) {
            log.error("Failed to fetch user {} from auth-service: {}", userId, e.getMessage());
            UserSummaryDTO fallback = new UserSummaryDTO();
            fallback.setId(userId);
            fallback.setFullName("Unknown user");
            return fallback;
        }
    }

    public UserSummaryDTO getUserByIdStrict(UUID userId) {
        if (userId == null) {
            return null;
        }

        try {
            return restClient.get()
                    .uri("/api/users/{id}", userId)
                    .retrieve()
                    .body(UserSummaryDTO.class);
        } catch (RestClientException e) {
            log.error("Strict user lookup failed for {} from auth-service: {}", userId, e.getMessage());
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
                    .body(new ParameterizedTypeReference<>() {});
        } catch (RestClientException e) {
            log.error("Failed to fetch users with role {} from auth-service: {}", role, e.getMessage());
            return List.of();
        }
    }
}
