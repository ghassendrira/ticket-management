package com.example.ragbackend.integration.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
public class AiServiceClient {

    private static final Logger LOGGER = LoggerFactory.getLogger(AiServiceClient.class);

    private final RestClient restClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AiServiceClient(
        @Value("${ai.service.url:http://localhost:8085}") String aiServiceUrl
    ) {
        this.restClient = RestClient.builder()
            .baseUrl(aiServiceUrl)
            .build();
    }

    public Optional<AiClassificationResponse> classifyQuick(String title, String description) {
        try {
            String raw = restClient.post()
                .uri(uriBuilder -> uriBuilder
                    .path("/api/ai/classify/quick")
                    .queryParam("title", safe(title, 200))
                    .queryParam("description", safe(description, 2000))
                    .build())
                .retrieve()
                .body(String.class);

            if (raw == null || raw.isBlank()) return Optional.empty();
            JsonNode root = objectMapper.readTree(raw);
            String category = textOr(root, "category", null);
            double confidence = doubleOr(root, "confidence", 0.0);
            if (category == null || category.isBlank()) return Optional.empty();
            return Optional.of(new AiClassificationResponse(category.toUpperCase().trim(), confidence));
        } catch (ResourceAccessException e) {
            LOGGER.warn("[AiServiceClient] AI service indisponible (classify): {}", e.getMessage());
            return Optional.empty();
        } catch (RestClientResponseException e) {
            LOGGER.warn("[AiServiceClient] Erreur HTTP classify — status={}", e.getStatusCode());
            return Optional.empty();
        } catch (Exception e) {
            LOGGER.warn("[AiServiceClient] Erreur inattendue classify: {}", e.getMessage());
            return Optional.empty();
        }
    }

    public Optional<String> generateSummary(String title, String description) {
        try {
            Map<String, Object> body = Map.of(
                "title", safe(title, 200),
                "description", safe(description, 4000)
            );
            String raw = restClient.post()
                .uri("/api/ai/summary")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(String.class);
            if (raw == null || raw.isBlank()) return Optional.empty();
            JsonNode root = objectMapper.readTree(raw);
            String summary = textOr(root, "summary", null);
            return summary == null ? Optional.empty() : Optional.of(summary);
        } catch (Exception e) {
            LOGGER.warn("[AiServiceClient] Echec generation resume: {}", e.getMessage());
            return Optional.empty();
        }
    }

    public Optional<AiPriorityResponse> estimatePriority(
        String title, String description, String category
    ) {
        try {
            Map<String, Object> body = Map.of(
                "ticketId", UUID.randomUUID().toString(),
                "title", safe(title, 200),
                "description", safe(description, 2000),
                "category", safe(category, 50),
                "customerTier", "STANDARD",
                "createdAt", LocalDateTime.now().toString()
            );

            String raw = restClient.post()
                .uri("/api/ai/priority")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(String.class);

            if (raw == null || raw.isBlank()) return Optional.empty();
            JsonNode root = objectMapper.readTree(raw);
            String level = textOr(root, "priorityLevel", null);
            int score = intOr(root, "finalScore", 50);
            if (level == null || level.isBlank()) return Optional.empty();
            return Optional.of(new AiPriorityResponse(level.toUpperCase().trim(), score));
        } catch (ResourceAccessException e) {
            LOGGER.warn("[AiServiceClient] AI service indisponible (priority): {}", e.getMessage());
            return Optional.empty();
        } catch (RestClientResponseException e) {
            LOGGER.warn("[AiServiceClient] Erreur HTTP priority — status={}", e.getStatusCode());
            return Optional.empty();
        } catch (Exception e) {
            LOGGER.warn("[AiServiceClient] Erreur inattendue priority: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private static String safe(String s, int max) {
        if (s == null) return "";
        String t = s.trim();
        return t.length() > max ? t.substring(0, max) : t;
    }

    private static String textOr(JsonNode node, String field, String fallback) {
        if (node == null) return fallback;
        JsonNode f = node.get(field);
        if (f == null || f.isNull()) return fallback;
        String s = f.asText();
        return (s == null || s.isBlank()) ? fallback : s.trim();
    }

    private static double doubleOr(JsonNode node, String field, double fallback) {
        if (node == null) return fallback;
        JsonNode f = node.get(field);
        if (f == null || f.isNull() || !f.isNumber()) return fallback;
        return f.asDouble(fallback);
    }

    private static int intOr(JsonNode node, String field, int fallback) {
        if (node == null) return fallback;
        JsonNode f = node.get(field);
        if (f == null || f.isNull() || !f.isNumber()) return fallback;
        return f.asInt(fallback);
    }

    public record AiClassificationResponse(String category, Double confidence) {}
    public record AiPriorityResponse(String priorityLevel, Integer finalScore) {}
}
