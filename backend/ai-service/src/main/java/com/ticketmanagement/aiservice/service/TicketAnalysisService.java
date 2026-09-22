package com.ticketmanagement.aiservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ticketmanagement.aiservice.client.GeminiApiClient;
import com.ticketmanagement.aiservice.dto.AiExplanation;
import com.ticketmanagement.aiservice.dto.AnalysisResult;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TicketAnalysisService {

    private final GeminiApiClient geminiApiClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final Set<String> VALID_CATEGORIES = Set.of(
        "ACCOUNT_ACCESS", "BILLING", "TECHNICAL", "ORDER", "DELIVERY", "SECURITY", "INFORMATION"
    );
    private static final Set<String> VALID_SENTIMENTS = Set.of(
        "SATISFIED", "NEUTRAL", "CONFUSED", "FRUSTRATED", "DISSATISFIED"
    );

    @CircuitBreaker(name = "gemini-api", fallbackMethod = "fallbackAnalyze")
    public AnalysisResult analyzeTicket(UUID ticketId, String title, String description) {
        String geminiJson = null;
        
        try {
            String prompt = buildPrompt(title, description);
            geminiJson = geminiApiClient.generateContent(prompt);
            log.debug("Réponse brute Gemini: {}", geminiJson);

            // Nettoie les ```json ... ``` et répare les JSON tronqués
            String cleanJson = geminiJson.replaceAll("(?s)```(?:json)?", "")
                                         .replaceAll("```", "")
                                         .trim();
            int objectStart = cleanJson.indexOf('{');
            int objectEnd = cleanJson.lastIndexOf('}');
            if (objectStart >= 0 && objectEnd > objectStart) {
                cleanJson = cleanJson.substring(objectStart, objectEnd + 1);
            }
            cleanJson = repairJson(cleanJson);  // ← AJOUT : répare les } manquants

            JsonNode root = objectMapper.readTree(cleanJson);

            String rawCategory = getTextOrDefault(root, "category", "INFORMATION").trim().toUpperCase()
                .replace(" ", "_").replace("-", "_");
            if (rawCategory.equals("ACCOUNT")) rawCategory = "ACCOUNT_ACCESS";
            String category = VALID_CATEGORIES.contains(rawCategory) ? rawCategory : "INFORMATION";
            
            double catConf = getDoubleOrDefault(root, "confidence",
                getDoubleOrDefault(root, "categoryConfidence", 0.5));

            String rawSentiment = getTextOrDefault(root, "sentiment", "NEUTRAL").trim().toUpperCase()
                .replace(" ", "_");
            String sentiment = VALID_SENTIMENTS.contains(rawSentiment) ? rawSentiment : "NEUTRAL";
            
            double sentConf = getDoubleOrDefault(root, "sentimentConfidence", 0.5);

            String catReason = "Analyse par defaut";
            String sentReason = "Analyse par defaut";
            
            JsonNode explanation = root.get("explanation");
            if (explanation != null && !explanation.isMissingNode()) {
                catReason = getTextOrDefault(explanation, "categoryReason", catReason);
                sentReason = getTextOrDefault(explanation, "sentimentReason", sentReason);
            }

            return new AnalysisResult(ticketId, category, catConf, sentiment, sentConf,
                new AiExplanation(catReason, sentReason));

        } catch (Exception e) {
            log.error("Erreur analyse ticket {}: {}", ticketId, e.getMessage());
            return fallbackAnalyze(ticketId, title, description, e);
        }
    }

    public AnalysisResult fallbackAnalyze(UUID ticketId, String title, String description, Exception ex) {
        log.warn("Fallback Gemini pour ticket {}: {}", ticketId, ex.getMessage());
        return new AnalysisResult(
            ticketId, "INFORMATION", 0.1, "NEUTRAL", 0.5,
            new AiExplanation(
                "Service IA indisponible ou reponse invalide. Valeur par defaut.",
                "Service IA indisponible ou reponse invalide. Valeurs par defaut."
            )
        );
    }

    private String buildPrompt(String title, String description) {
        return """
            You are an AI ticket classification system.

                Classify the customer ticket into EXACTLY ONE category based on the MAIN PURPOSE and MEANING of the ticket, not isolated keywords.

                The only valid categories are ACCOUNT_ACCESS, BILLING, TECHNICAL, ORDER, DELIVERY, SECURITY, and INFORMATION.

                BILLING:
                - Payments, card payments, duplicate charges, refunds, transactions, money debited, invoices, billing problems, and payment failures.
                - A failed or declined payment is BILLING when the customer's main problem is the payment or money.
                - Do not classify it as TECHNICAL just because words such as "failed", "error", or "problem" appear.

                TECHNICAL:
                - Application crashes, website errors, API errors, pages not loading, server/system errors, software bugs, and technical malfunctions.

                ACCOUNT:
                - Account locked, cannot log in, password problems, account access problems, account activation, and profile/account access.

                Examples that must be respected:
                - "Card charged twice" -> BILLING
                - "Payment was declined" -> BILLING
                - "I want a refund for a payment" -> BILLING
                - "The application crashes when opening the dashboard" -> TECHNICAL
                - "The website page does not load" -> TECHNICAL
                - "My account is locked" -> ACCOUNT
                - "I cannot log in to my account" -> ACCOUNT
                - "I forgot my password" -> ACCOUNT

                Read both the title and description. The description has priority when it is more specific.

            INPUT:

            Title:
            %s

            Description:
            %s

            OUTPUT:

                        Respond ONLY with valid JSON in exactly this structure:
            {
              "category": "BILLING",
                            "confidence": 0.95
            }

                        The category value MUST be exactly one of: ACCOUNT_ACCESS, BILLING, TECHNICAL, ORDER, DELIVERY, SECURITY, INFORMATION.
                        Do not add explanations or additional fields.
            """.formatted(title, description);
    }

    // AJOUT : répare les JSON tronqués en comptant les { et }
    private String repairJson(String json) {
        int openBraces = 0;
        for (char c : json.toCharArray()) {
            if (c == '{') openBraces++;
            else if (c == '}') openBraces--;
        }
        StringBuilder repaired = new StringBuilder(json);
        for (int i = 0; i < openBraces; i++) {
            repaired.append('}');
        }
        return repaired.toString();
    }

    private String getTextOrDefault(JsonNode node, String field, String defaultValue) {
        JsonNode value = node.get(field);
        return (value != null && !value.isNull()) ? value.asText(defaultValue) : defaultValue;
    }

    private double getDoubleOrDefault(JsonNode node, String field, double defaultValue) {
        JsonNode value = node.get(field);
        return (value != null && !value.isNull() && value.isNumber()) ? value.asDouble(defaultValue) : defaultValue;
    }
}