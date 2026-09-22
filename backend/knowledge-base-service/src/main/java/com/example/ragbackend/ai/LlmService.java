package com.example.ragbackend.ai;

import com.example.ragbackend.exception.LlmGenerationException;
import com.example.ragbackend.exception.OllamaUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class LlmService {

    private static final Logger LOGGER = LoggerFactory.getLogger(LlmService.class);

    private static final String SYSTEM_PROMPT_RAG =
        "Tu es un assistant support client. Réponds UNIQUEMENT en te basant sur les documents fournis dans le contexte. "
            + "Ne fais aucune supposition et n'invente aucune information. Si l'information n'est pas présente dans le contexte, "
            + "indique clairement que tu ne trouves pas de réponse dans la base documentaire. "
            + "Cite systématiquement tes sources (titre du document, page si disponible). "
            + "Réponds dans la langue de la question de l'utilisateur (français par défaut). "
            + "Sois concis, professionnel et utile.";

    private static final String SYSTEM_PROMPT_ESCALATION =
        "Tu es un agent de supervision du support client. Résume cette conversation de manière factuelle et structurée "
            + "pour créer un ticket de support destiné à un agent humain. Ne rajoute aucune information qui ne serait pas "
            + "présente dans la conversation. Inclus: le problème principal, les étapes déjà tentées, et le sentiment du client.";

    private final RestTemplate restTemplate;
    private final String ollamaBaseUrl;
    private final String llmModel;
    private final double temperature;
    private final int maxTokens;

    public LlmService(
        RestTemplate restTemplate,
        @Value("${rag.ollama.base-url:http://localhost:11434}") String ollamaBaseUrl,
        @Value("${rag.ollama.llm-model:qwen2.5:14b}") String llmModel,
        @Value("${rag.llm.temperature:0.3}") double temperature,
        @Value("${rag.llm.max-tokens:2048}") int maxTokens
    ) {
        this.restTemplate = restTemplate;
        this.ollamaBaseUrl = ollamaBaseUrl.endsWith("/")
            ? ollamaBaseUrl.substring(0, ollamaBaseUrl.length() - 1)
            : ollamaBaseUrl;
        this.llmModel = llmModel;
        this.temperature = temperature;
        this.maxTokens = maxTokens;
        LOGGER.info("[LlmService] baseUrl={}, model={}, temperature={}, maxTokens={}",
            this.ollamaBaseUrl, this.llmModel, this.temperature, this.maxTokens);
    }

    public String generateAnswer(String question, List<String> context) {
        if (context == null || context.isEmpty()) {
            return generate(SYSTEM_PROMPT_RAG,
                "Question: " + question + "\n\nAucun document pertinent n'a été trouvé dans la base. "
                    + "Indique que tu ne trouves pas de réponse dans la base documentaire.");
        }

        StringBuilder userPrompt = new StringBuilder();
        userPrompt.append("=== DOCUMENTS DE CONTEXTE ===\n\n");
        for (int i = 0; i < context.size(); i++) {
            userPrompt.append("--- Document #").append(i + 1).append(" ---\n");
            userPrompt.append(context.get(i)).append("\n\n");
        }
        userPrompt.append("=== FIN DES DOCUMENTS ===\n\n");
        userPrompt.append("En te basant EXCLUSIVEMENT sur les documents ci-dessus, réponds à la question suivante:\n");
        userPrompt.append("Question: ").append(question).append("\n\n");
        userPrompt.append("Rappelle-toi: si l'information n'est pas dans les documents, dis-le explicitement. "
            + "Cite tes sources.");

        return generate(SYSTEM_PROMPT_RAG, userPrompt.toString());
    }

    public String generateEscalationSummary(List<String> messages) {
        if (messages == null || messages.isEmpty()) {
            return "Conversation vide - aucun message à résumer.";
        }

        StringBuilder transcript = new StringBuilder();
        transcript.append("=== HISTORIQUE DE CONVERSATION ===\n\n");
        for (int i = 0; i < messages.size(); i++) {
            transcript.append("[").append(i % 2 == 0 ? "CLIENT" : "ASSISTANT").append("] ");
            transcript.append(messages.get(i)).append("\n\n");
        }
        transcript.append("=== FIN HISTORIQUE ===\n\n");
        transcript.append("Produis un résumé structuré pour ticket de support en 3 parties:\n"
            + "1. Problème principal\n"
            + "2. Étapes / solutions déjà tentées\n"
            + "3. Sentiment client et état actuel");

        return generate(SYSTEM_PROMPT_ESCALATION, transcript.toString());
    }

    public String generate(String systemPrompt, String userPrompt) {
        List<ChatMessage> messages = new ArrayList<>();
        if (systemPrompt != null && !systemPrompt.isBlank()) {
            messages.add(new ChatMessage("system", systemPrompt));
        }
        if (userPrompt != null && !userPrompt.isBlank()) {
            messages.add(new ChatMessage("user", userPrompt));
        }
        return chat(messages);
    }

    public String chat(List<ChatMessage> messages) {
        if (messages == null || messages.isEmpty()) {
            throw new IllegalArgumentException("Cannot generate with empty messages");
        }

        String endpoint = ollamaBaseUrl + "/api/chat";

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> options = new HashMap<>();
            options.put("temperature", temperature);
            options.put("top_p", 0.9);
            options.put("repeat_penalty", 1.1);
            options.put("num_predict", maxTokens);

            Map<String, Object> body = new HashMap<>();
            body.put("model", llmModel);
            body.put("stream", false);
            body.put("messages", messages.stream()
                .map(m -> Map.of("role", m.role(), "content", m.content()))
                .toList());
            body.put("options", options);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(endpoint, request, Map.class);

            if (response == null) {
                throw new LlmGenerationException("[LlmService] Réponse nulle d'Ollama sur " + endpoint);
            }

            Object messageObj = response.get("message");
            if (messageObj instanceof Map<?, ?> msgMap) {
                Object content = msgMap.get("content");
                if (content != null) {
                    return content.toString().trim();
                }
            }

            Object done = response.get("done");
            Object rawResponse = response.get("response");
            if (rawResponse instanceof String s && !s.isBlank()) {
                return s.trim();
            }

            LOGGER.error("[LlmService] Format réponse LLM non reconnu: clés={}", response.keySet());
            throw new LlmGenerationException(
                "[LlmService] Format de réponse LLM invalide. Vérifiez que le modèle '" + llmModel + "' est installé."
                    + " Commande: ollama pull " + llmModel
            );

        } catch (ResourceAccessException e) {
            throw new OllamaUnavailableException(
                "[LlmService] Ollama est inaccessible sur " + ollamaBaseUrl
                    + ". Vérifiez qu'Ollama est démarré et que le modèle '" + llmModel + "' est installé."
                    + " Commande: ollama pull " + llmModel,
                e
            );
        } catch (RestClientException e) {
            throw new LlmGenerationException(
                "[LlmService] Erreur réseau lors de l'appel LLM: " + e.getMessage(), e
            );
        }
    }

    public String getModelName() {
        return llmModel;
    }

    public double getTemperature() {
        return temperature;
    }

    public int getMaxTokens() {
        return maxTokens;
    }

    public record ChatMessage(String role, String content) {}
}
