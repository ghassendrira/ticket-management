package com.ticketmanagement.aiservice.client;

import com.ticketmanagement.aiservice.dto.gemini.GeminiApiRequest;
import com.ticketmanagement.aiservice.dto.gemini.GeminiApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class GeminiApiClient {

    @Value("${gemini.api-key}")
    private String apiKey;

    @Value("${gemini.model}")
    private String model;

    @Value("${gemini.base-url}")
    private String baseUrl;

    private final WebClient webClient;

    public String generateContent(String prompt) {
        GeminiApiRequest request = new GeminiApiRequest(
            List.of(new GeminiApiRequest.Content(
                List.of(new GeminiApiRequest.Part(prompt))
            )),
            new GeminiApiRequest.GenerationConfig(0.1, "application/json")
        );

        try {
            GeminiApiResponse response = webClient.post()
                .uri(baseUrl + "/" + model + ":generateContent")
                .header("x-goog-api-key", apiKey)
                .bodyValue(request)
                .retrieve()
                .onStatus(
                    status -> status.isError(),
                    clientResponse -> clientResponse.bodyToMono(String.class)
                        .map(body -> new RuntimeException("Gemini API " + clientResponse.statusCode() + ": " + body))
                )
                .bodyToMono(GeminiApiResponse.class)
                .timeout(Duration.ofSeconds(30))  // ← 30s au lieu de 10s
                .block();

            if (response == null || response.candidates() == null || response.candidates().isEmpty()) {
                throw new RuntimeException("Reponse Gemini vide (pas de candidates)");
            }
            
            String text = response.candidates().get(0).content().parts().get(0).text();
            if (text == null || text.isBlank()) {
                throw new RuntimeException("Reponse Gemini vide (texte null)");
            }
            
            return text;
            
        } catch (Exception e) {
            log.error("Appel Gemini echoue: {}", e.getMessage());
            throw new RuntimeException("Echec appel Gemini: " + e.getMessage(), e);
        }
    }
}