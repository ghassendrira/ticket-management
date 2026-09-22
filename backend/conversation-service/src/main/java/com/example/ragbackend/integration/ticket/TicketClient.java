package com.example.ragbackend.integration.ticket;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;

@Component
public class TicketClient {

    private final RestClient restClient;
    private final String internalServiceSecret;

    public TicketClient(
            @Value("${ticket.service.url:http://localhost:8081}") String ticketServiceUrl,
            @Value("${internal.service-secret:my-super-secret-internal-key-for-service-to-service-communication-only}") String internalServiceSecret) {
        this.restClient = RestClient.builder()
                .baseUrl(ticketServiceUrl)
                .build();
        this.internalServiceSecret = internalServiceSecret;
    }

    public Map<String, Object> createTicket(Map<String, Object> ticketRequest, String userId, String userRole) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-User-Id", userId);
            headers.set("X-User-Role", userRole);
            headers.set("X-Internal-Service-Key", internalServiceSecret);

            return restClient.post()
                    .uri("/api/tickets")
                    .headers(h -> h.addAll(headers))
                    .body(ticketRequest)
                    .retrieve()
                    .body(Map.class);
        } catch (RestClientException e) {
            throw new RuntimeException("Failed to create ticket: " + e.getMessage(), e);
        }
    }
}
