package com.ticketmanagement.aiservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import com.ticketmanagement.aiservice.exception.AiServiceException;
import org.springframework.core.ParameterizedTypeReference;
import java.util.HashMap;

@Service
public class OllamaService {

    private static final Logger log = LoggerFactory.getLogger(OllamaService.class);

    private final WebClient webClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${ollama.base-url:http://localhost:11434}")
    private String ollamaBaseUrl;

    @Value("${ollama.embedding-model:nomic-embed-text}")
    private String embeddingModel;

    @Value("${ollama.chat-model:qwen2.5:7b}")
    private String chatModel;

    public OllamaService(WebClient webClient) {
        this.webClient = webClient;
    }

    public List<Double> generateEmbedding(String text) {
        try {
            Map<String, Object> requestBody = Map.of(
                    "model", embeddingModel,
                    "prompt", text
            );

            String response = webClient.post()
                    .uri(ollamaBaseUrl + "/api/embeddings")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(30))
                    .block();

            JsonNode root = objectMapper.readTree(response);
            JsonNode embeddingNode = root.get("embedding");

            if (embeddingNode == null || !embeddingNode.isArray()) {
                throw new RuntimeException("Ollama response did not contain a valid embedding array");
            }

            List<Double> embedding = new ArrayList<>();
            embeddingNode.forEach(node -> embedding.add(node.asDouble()));

            return embedding;
        } catch (Exception e) {
            log.error("Failed to generate embedding via Ollama: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate embedding: " + e.getMessage(), e);
        }
    }

    public String generateSummary(String title, String description) {
        String prompt = buildSummaryPrompt(title, description);

        Map<String, Object> options = Map.of(
                "temperature", 0.3,
                "num_predict", 200
        );

        Map<String, Object> requestBody = Map.of(
                "model", chatModel,
                "prompt", prompt,
                "stream", false,
                "options", options
        );

        try {
            String response = webClient.post()
                    .uri(ollamaBaseUrl + "/api/generate")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(90))
                    .block();

            JsonNode root = objectMapper.readTree(response);
            JsonNode summaryNode = root.get("response");

            if (summaryNode == null) {
                throw new RuntimeException("Ollama response did not contain a 'response' field");
            }

            return summaryNode.asText().trim();
        } catch (Exception e) {
            log.error("Failed to generate summary via Ollama: {}", e.getMessage(), e);
            throw new RuntimeException("Summary generation failed: " + e.getMessage(), e);
        }
    }

    private String buildSummaryPrompt(String title, String description) {
        return """
            You are a professional IT support assistant.
            Summarize the following support ticket in 2 to 4 clear, concise sentences.
            Write the summary in the SAME LANGUAGE as the ticket (French or English).
            Do NOT add information that is not in the ticket.
            Do NOT mention the ticket number or metadata.

            Ticket Title: %s

            Ticket Description: %s

            Summary:
            """.formatted(title, description);
    }

    /**
 * Génère une réponse suggérée pour l'agent support via Ollama (/api/generate).
 * Utilise le modèle chat configuré (qwen2.5:7b).
 */
public String generateSuggestedResponse(String title, String description) {
    String prompt = buildResponsePrompt(title, description);

    Map<String, Object> requestBody = Map.of(
        "model", chatModel,        // "qwen2.5:7b"
        "prompt", prompt,
        "stream", false,
        "options", Map.of(
            "temperature", 0.4,
            "num_predict", 250
        )
    );

    try {
        Map<String, Object> response = webClient.post()
            .uri(ollamaBaseUrl + "/api/generate")
            .bodyValue(requestBody)
            .retrieve()
            .bodyToMono(Map.class)
            .timeout(Duration.ofSeconds(120))
            .block();

        String reply = (String) response.get("response");
        return reply != null ? reply.trim() : "";

    } catch (Exception e) {
        log.error("Failed to generate suggested response via Ollama", e);
        throw new AiServiceException("Suggested response generation failed: " + e.getMessage());
    }
}

public String translateText(String text, String targetLanguage) {
    String prompt = buildTranslationPrompt(text, targetLanguage);

    Map<String, Object> requestBody = Map.of(
        "model", chatModel,
        "prompt", prompt,
        "stream", false,
        "options", Map.of(
            "temperature", 0.2,
            "num_predict", 600
        )
    );

    try {
        Map<String, Object> response = webClient.post()
            .uri(ollamaBaseUrl + "/api/generate")
            .bodyValue(requestBody)
            .retrieve()
            .bodyToMono(Map.class)
            .timeout(Duration.ofSeconds(120))
            .block();

        String translated = response != null ? (String) response.get("response") : null;
        if (translated == null || translated.isBlank()) {
            throw new AiServiceException("Empty translation response from Ollama");
        }

        return stripWrappingQuotes(translated.trim());
    } catch (Exception e) {
        log.error("Failed to translate text via Ollama", e);
        throw new AiServiceException("Translation failed: " + e.getMessage());
    }
}

private String buildResponsePrompt(String title, String description) {
    String content = (description != null && !description.isBlank()) 
        ? description 
        : title;

    return """
        You are a professional customer support agent.
        Draft a helpful, empathetic reply to the customer for the following support ticket.

        Rules:
        - Write in the SAME LANGUAGE as the ticket (French or English).
        - Be concise: 3 to 6 short sentences maximum.
        - Acknowledge the customer's issue with empathy.
        - Provide clear next steps or a solution.
        - If specific details are missing (like transaction ID, order number, account email), politely ask the customer to provide them.
        - Do NOT invent facts, dates, or account information not present in the ticket.
        - Use a professional but friendly tone.
        - Include a short greeting and a courteous closing.

        Ticket Title: %s

        Ticket Content: %s

        Draft the reply now:
        """.formatted(title, content);
}

private String buildTranslationPrompt(String text, String targetLanguage) {
    return """
        You are a professional translator for a ticket management system.
        Translate the text below into %s.

        Rules:
        - Return ONLY the translated text.
        - Do not add explanations, notes, quotes, bullet points, or markdown.
        - Preserve the original meaning, tone, and paragraph breaks.
        - Keep IDs, URLs, email addresses, code snippets, and technical identifiers unchanged.
        - If the text is already in the target language, return it naturally as-is.

        Text:
        %s
        """.formatted(targetLanguage, text);
}
/**
 * Appelle Qwen pour obtenir le score modèle (sévérité) et le score sentiment/urgence.
 * Retourne un tableau [modelScore, sentimentScore] entre 0 et 100.
 */
public double[] estimatePriorityScores(String title, String description, String category) {
    String prompt = buildPriorityPrompt(title, description, category);

    Map<String, Object> options = new HashMap<>();
    options.put("temperature", 0.2); // très déterministe
    options.put("num_predict", 150);

    Map<String, Object> requestBody = new HashMap<>();
    requestBody.put("model", chatModel);
    requestBody.put("prompt", prompt);
    requestBody.put("stream", false);
    requestBody.put("format", "json"); // Ollama force le JSON si supporté
    requestBody.put("options", options);

    try {
        Map<String, Object> response = webClient.post()
                .uri(ollamaBaseUrl + "/api/generate")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .timeout(Duration.ofSeconds(30))
                .block();

        if (response == null || response.get("response") == null) {
            throw new AiServiceException("Empty priority response from Ollama");
        }

        String raw = response.get("response").toString().trim();
        log.debug("Ollama priority raw response: {}", raw);
        String cleanJson = raw.replaceAll("(?s)```(?:json)?", "")
                .replaceAll("```", "")
                .trim();
        int objectStart = cleanJson.indexOf('{');
        int objectEnd = cleanJson.lastIndexOf('}');
        if (objectStart >= 0 && objectEnd > objectStart) {
            cleanJson = cleanJson.substring(objectStart, objectEnd + 1);
        }

        JsonNode root = objectMapper.readTree(cleanJson);
        String priority = root.path("priority").asText("").trim().toUpperCase();
        double score = switch (priority) {
            case "CRITICAL" -> 95.0;
            case "HIGH" -> 75.0;
            case "LOW" -> 20.0;
            case "MEDIUM" -> 50.0;
            default -> throw new AiServiceException("Invalid priority returned by Ollama");
        };
        return new double[]{score, score};

    } catch (Exception e) {
        log.error("Priority estimation failed", e);
        // Fallback : retourne des scores neutres pour ne pas bloquer le pipeline
        return new double[]{50.0, 50.0};
    }
}

private String buildPriorityPrompt(String title, String description, String category) {
    return """
        You are an IT support priority classifier. Analyze the ticket below and return ONLY a JSON object. No markdown, no explanation outside the JSON.

        Ticket Title: %s
        Ticket Description: %s
        Category: %s

                Return exactly:
        {
                    "priority": "LOW | MEDIUM | HIGH | CRITICAL",
                    "reason": "short reason"
        }

                Rules:
                - CRITICAL: security breach, hacked account, failed blocking payment, or service unavailable for many users.
                - HIGH: explicit urgency (urgent, today, tomorrow), financial impact, customer blocked, or immediate business impact.
                - MEDIUM: real support problem without strong urgency.
                - LOW: simple non-blocking information request.
                Use exactly one of LOW, MEDIUM, HIGH, CRITICAL.
        """.formatted(title, description != null ? description : "N/A", category != null ? category : "OTHER");
}

private double extractJsonInt(String json, String key) {
    try {
        int idx = json.indexOf(key);
        if (idx == -1) return 50.0;
        int colon = json.indexOf(':', idx);
        int comma = json.indexOf(',', colon);
        int end = (comma == -1) ? json.indexOf('}', colon) : comma;
        String num = json.substring(colon + 1, end).trim();
        return Double.parseDouble(num);
    } catch (Exception e) {
        log.warn("Failed to parse {} from JSON: {}", key, json);
        return 50.0;
    }
}

private String stripWrappingQuotes(String value) {
    if (value.length() >= 2) {
        boolean doubleQuoted = value.startsWith("\"") && value.endsWith("\"");
        boolean singleQuoted = value.startsWith("'") && value.endsWith("'");
        if (doubleQuoted || singleQuoted) {
            return value.substring(1, value.length() - 1).trim();
        }
    }

    return value;
}
}
