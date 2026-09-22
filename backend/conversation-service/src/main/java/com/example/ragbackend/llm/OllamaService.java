package com.example.ragbackend.llm;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class OllamaService {
    
    private final RestTemplate restTemplate = new RestTemplate();
    private final String ollamaUrl = "http://localhost:11434/api/generate";
    private final String model = "llama3.2:1b";

    public String generateGeneralAnswer(String question) {
        String prompt = "Tu es un assistant support client. Réponds en français, de manière courte et professionnelle (2-3 phrases maximum).\n\n"
            + "Question: " + question + "\n\n"
            + "Réponse courte et professionnelle:";

        return cleanOllamaResponse(callOllama(prompt));
    }

    public String generateRagAnswer(String question, List<String> contexts) {
        // Nettoyer et préparer les contextes
        String ctx = contexts.stream()
            .filter(c -> c != null && !c.isBlank())
            .map(c -> c.trim().replaceAll("\\s+", " "))
            .distinct()
            .limit(3)
            .collect(Collectors.joining("\n\n"));

        if (ctx.isBlank()) {
            return generateGeneralAnswer(question);
        }

        // Prompt optimisé pour petit modèle (1B)
        String prompt = "Instructions: Réponds à la question UNIQUEMENT avec les infos du texte ci-dessous. "
            + "Sois direct, professionnel, en français. 2-4 phrases max. Ne dis pas 'selon le texte'.\n\n"
            + "Texte source:\n\"\"\"\n" + ctx + "\n\"\"\"\n\n"
            + "Question: " + question + "\n\n"
            + "Réponse directe:";

        String rawResponse = callOllama(prompt);
        String cleaned = cleanOllamaResponse(rawResponse);
        
        // Si Ollama donne une mauvaise réponse, fallback pro
        if (cleaned.contains("indisponible") || cleaned.length() < 20) {
            return buildProFallback(ctx);
        }
        
        return cleaned;
    }

    // Nettoie les réponses d'Ollama (enlève les répétitions, les phrases vides, etc.)
    private String cleanOllamaResponse(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        
        // Enlève les préfixes communs
        String cleaned = raw
            .replaceAll("(?i)^réponse\\s*directe\\s*:\\s*", "")
            .replaceAll("(?i)^réponse\\s*:\\s*", "")
            .replaceAll("(?i)^voici\\s*la\\s*réponse\\s*:\\s*", "")
            .replaceAll("(?i)^selon\\s*le\\s*texte\\s*,?\\s*", "")
            .replaceAll("(?i)^d'après\\s*le\\s*document\\s*,?\\s*", "")
            .trim();
        
        // Enlève les phrases répétées
        String[] sentences = cleaned.split("(?<=[.!?])\\s+");
        StringBuilder result = new StringBuilder();
        String lastSentence = "";
        
        for (String sentence : sentences) {
            String normalized = sentence.toLowerCase().replaceAll("\\s+", " ").trim();
            if (!normalized.equals(lastSentence) && normalized.length() > 5) {
                result.append(sentence).append(" ");
                lastSentence = normalized;
            }
        }
        
        return result.toString().trim();
    }

    // Fallback professionnel si Ollama déconne
    private String buildProFallback(String context) {
        String[] parts = context.split("\n\n");
        StringBuilder answer = new StringBuilder();
        
        answer.append("Voici les informations disponibles dans la documentation :\n\n");
        
        for (int i = 0; i < Math.min(parts.length, 3); i++) {
            String part = parts[i].trim();
            if (part.length() > 300) {
                part = part.substring(0, 300) + "...";
            }
            answer.append("• ").append(part).append("\n\n");
        }
        
        answer.append("Si vous avez besoin d'aide supplémentaire, cliquez sur 'Contacter le support'.");
        return answer.toString();
    }

    private String callOllama(String prompt) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            // Options optimisées pour llama3.2:1b
            Map<String, Object> options = Map.of(
                "temperature", 0.1,      // Très faible = plus direct
                "num_predict", 200,      // Limite la longueur
                "top_p", 0.9,
                "repeat_penalty", 1.2    // Évite les répétitions
            );
            
            Map<String, Object> body = Map.of(
                "model", model,
                "prompt", prompt,
                "stream", false,
                "options", options
            );
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            Map<String, Object> response = restTemplate.postForObject(ollamaUrl, request, Map.class);
            
            if (response != null && response.get("response") != null) {
                return response.get("response").toString().trim();
            }
            return "";
            
        } catch (Exception e) {
            System.err.println("Erreur Ollama: " + e.getMessage());
            return "indisponible";
        }
    }
}