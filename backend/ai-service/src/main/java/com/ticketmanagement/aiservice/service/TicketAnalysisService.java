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
        "ACCOUNT_ACCESS", "BILLING", "TECHNICAL", "ORDER", 
        "DELIVERY", "SECURITY", "INFORMATION", "OTHER"
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
            String cleanJson = geminiJson.replaceAll("(?s)^```json\\s*", "")
                                         .replaceAll("(?s)\\s*```$", "")
                                         .trim();
            cleanJson = repairJson(cleanJson);  // ← AJOUT : répare les } manquants

            JsonNode root = objectMapper.readTree(cleanJson);

            String rawCategory = getTextOrDefault(root, "category", "OTHER").trim().toUpperCase()
                .replace(" ", "_").replace("-", "_");
            String category = VALID_CATEGORIES.contains(rawCategory) ? rawCategory : "OTHER";
            
            double catConf = getDoubleOrDefault(root, "categoryConfidence", 0.5);

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
            log.error("Erreur analyse ticket {}. JSON brut: {}", ticketId, geminiJson, e);
            return fallbackAnalyze(ticketId, title, description, e);
        }
    }

    public AnalysisResult fallbackAnalyze(UUID ticketId, String title, String description, Exception ex) {
        log.warn("Fallback Gemini pour ticket {}: {}", ticketId, ex.getMessage());
        return new AnalysisResult(
            ticketId, "OTHER", 0.5, "NEUTRAL", 0.5,
            new AiExplanation(
                "Service IA indisponible ou reponse invalide. Valeurs par defaut.",
                "Service IA indisponible ou reponse invalide. Valeurs par defaut."
            )
        );
    }

    private String buildPrompt(String title, String description) {
        return """
            Tu es un analyste support senior. Analyse ce ticket et reponds UNIQUEMENT en JSON strict valide, sans markdown, sans texte autour.

            Ticket :
            Titre : %s
            Description : %s

            Instructions :
            1. Classe dans EXACTEMENT une categorie parmi : ACCOUNT_ACCESS, BILLING, TECHNICAL, ORDER, DELIVERY, SECURITY, INFORMATION, OTHER
            2. Identifie le sentiment parmi : SATISFIED, NEUTRAL, CONFUSED, FRUSTRATED, DISSATISFIED
            3. Donne un score de confiance entre 0.0 et 1.0 pour chaque
            4. Explique en UNE PHRASE chaque decision dans "explanation"

            Format JSON obligatoire :
            {
              "category": "BILLING",
              "categoryConfidence": 0.92,
              "sentiment": "FRUSTRATED",
              "sentimentConfidence": 0.85,
              "explanation": {
                "categoryReason": "Le ticket concerne une erreur de facturation.",
                "sentimentReason": "Le client exige un remboursement immediat."
              }
            }
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