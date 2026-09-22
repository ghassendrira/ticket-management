package com.example.ragbackend.ai;

import com.example.ragbackend.ai.dto.EscalationSummaryRequest;
import com.example.ragbackend.ai.dto.EscalationSummaryResponse;
import com.example.ragbackend.conversation.ConversationEntity;
import com.example.ragbackend.conversation.ConversationRepository;
import com.example.ragbackend.conversation.MessageEntity;
import com.example.ragbackend.conversation.MessageRepository;
import com.example.ragbackend.exception.ErrorResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Hidden;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/ai")
@Tag(name = "Escalade Support", description = "API de synthèse de conversations et génération de tickets de support structurés")
@Hidden
public class AiEscalationApi {

    private static final Logger LOGGER = LoggerFactory.getLogger(AiEscalationApi.class);

    private static final String SYSTEM_PROMPT =
        """
        You are a customer support summarization assistant. Given a conversation between a CUSTOMER and an ASSISTANT,
        produce a structured JSON summary. Respond ONLY as valid JSON with no other text.

        Required JSON schema (produce valid JSON ONLY):
        {
          "title": "Short 5-10 words title summarizing the problem",
          "summary": "3-5 sentences factual summary of what the customer asked and what was tried. Do NOT invent facts. Use ONLY what appears in conversation.",
          "predictedCategory": "One of: TECHNICAL, BILLING, ACCOUNT, PRODUCT_INFO, OTHER",
          "predictedPriority": "One of: LOW, MEDIUM, HIGH, URGENT. Based on urgency and customer frustration.",
          "sentiment": "One of: POSITIVE, NEUTRAL, NEGATIVE, ANGRY",
          "attemptedSolutions": ["short list of solutions the assistant suggested or tried. May be empty array."]
        }

        Rules:
        - Base EVERYTHING only on the provided conversation. Do NOT invent facts, categories, or solutions.
        - If conversation is empty/too short, use "OTHER" / "LOW" / "NEUTRAL".
        - If no solutions were attempted, attemptedSolutions MUST be an empty array [].
        - Keep summary factual and concise. Do not add recommendations.
        - Respond in French if the conversation is in French.
        """;

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final LlmService llmService;
    private final ObjectMapper objectMapper;

    public AiEscalationApi(
        ConversationRepository conversationRepository,
        MessageRepository messageRepository,
        LlmService llmService,
        ObjectMapper objectMapper
    ) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.llmService = llmService;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/escalation-summary-legacy")
    @Operation(hidden = true)
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Résumé généré",
            content = @Content(schema = @Schema(implementation = EscalationSummaryResponse.class))),
        @ApiResponse(responseCode = "404", description = "Conversation introuvable",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    EscalationSummaryResponse summarizeEscalationHidden(
        @Valid @RequestBody EscalationSummaryRequest request) {
        return summarizeEscalation(request);
    }

    public EscalationSummaryResponse summarizeEscalation(
        @Valid @RequestBody
        @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "ID de la conversation à résumer (UUID)",
            required = true,
            content = @Content(
                examples = {
                    @ExampleObject(
                        name = "Exemple de request",
                        value = "{\"conversationId\": \"b2c3d4e5-2345-6789-0bcd-efa123456789\"}"
                    )
                }
            )
        )
        EscalationSummaryRequest request
    ) {
        UUID conversationId = request.conversationId();
        LOGGER.info("[AiEscalationApi] summarize-escalation - conversationId={}", conversationId);

        ConversationEntity conversation = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Conversation introuvable: " + conversationId));

        List<MessageEntity> messages = messageRepository
            .findAllByConversationIdOrderByIdAsc(conversationId);

        if (messages.isEmpty()) {
            return new EscalationSummaryResponse(
                "Conversation vide",
                "Aucun message échangé dans cette conversation.",
                "OTHER",
                "LOW",
                "NEUTRAL",
                List.of()
            );
        }

        String transcript = buildTranscript(messages);

        String userPrompt = "Here is the conversation to summarize. Respond ONLY as valid JSON.\n\n"
            + "===== CONVERSATION TRANSCRIPT =====\n"
            + transcript
            + "\n===== END TRANSCRIPT =====\n\n"
            + "JSON summary:";

        try {
            String raw = llmService.generate(SYSTEM_PROMPT, userPrompt);
            return parseSummary(raw);
        } catch (Exception e) {
            LOGGER.error("[AiEscalationApi] Erreur génération résumé: {}", e.getMessage(), e);
            return buildFallbackSummary(messages, conversation);
        }
    }

    private String buildTranscript(List<MessageEntity> messages) {
        StringBuilder sb = new StringBuilder();
        for (MessageEntity m : messages) {
            String label = switch (m.getRole() == null ? "USER" : m.getRole().toUpperCase()) {
                case "ASSISTANT" -> "ASSISTANT";
                case "SYSTEM" -> "SYSTEM";
                default -> "CUSTOMER";
            };
            sb.append("[").append(label).append("]: ");
            sb.append(m.getContent() == null ? "" : m.getContent().trim());
            sb.append("\n\n");
        }
        return sb.toString();
    }

    private EscalationSummaryResponse parseSummary(String rawLlmResponse) {
        if (rawLlmResponse == null || rawLlmResponse.isBlank()) {
            throw new RuntimeException("Réponse LLM vide pour le résumé");
        }

        String json = extractJson(rawLlmResponse);

        try {
            JsonNode root = objectMapper.readTree(json);

            String title = textOr(root, "title", "Ticket support client");
            String summary = textOr(root, "summary",
                "Le client a contacté le support. Résumé généré automatiquement.");
            String category = textOr(root, "predictedCategory", "OTHER")
                .toUpperCase().trim();
            String priority = textOr(root, "predictedPriority", "LOW")
                .toUpperCase().trim();
            String sentiment = textOr(root, "sentiment", "NEUTRAL")
                .toUpperCase().trim();

            List<String> solutions = new ArrayList<>();
            JsonNode solsNode = root.get("attemptedSolutions");
            if (solsNode != null && solsNode.isArray()) {
                for (JsonNode n : solsNode) {
                    if (n != null && !n.isNull()) {
                        String s = n.asText();
                        if (s != null && !s.isBlank()) solutions.add(s.trim());
                    }
                }
            }

            List<String> allowedCategories = List.of("TECHNICAL", "BILLING", "ACCOUNT", "PRODUCT_INFO", "OTHER");
            List<String> allowedPriorities = List.of("LOW", "MEDIUM", "HIGH", "URGENT");
            List<String> allowedSentiments = List.of("POSITIVE", "NEUTRAL", "NEGATIVE", "ANGRY");
            if (!allowedCategories.contains(category)) category = "OTHER";
            if (!allowedPriorities.contains(priority)) priority = "LOW";
            if (!allowedSentiments.contains(sentiment)) sentiment = "NEUTRAL";

            return new EscalationSummaryResponse(
                safeTrim(title, 120),
                safeTrim(summary, 800),
                category,
                priority,
                sentiment,
                List.copyOf(solutions)
            );

        } catch (JsonProcessingException e) {
            LOGGER.warn("[AiEscalationApi] Impossible de parser JSON LLM: {} -> {}", e.getMessage(), rawLlmResponse);
            throw new RuntimeException("Format JSON invalide dans la réponse LLM: " + e.getMessage());
        }
    }

    private EscalationSummaryResponse buildFallbackSummary(
        List<MessageEntity> messages,
        ConversationEntity conversation
    ) {
        StringBuilder sb = new StringBuilder();
        int customerMessages = 0;
        for (MessageEntity m : messages) {
            boolean isCustomer = !"ASSISTANT".equalsIgnoreCase(m.getRole());
            if (isCustomer && m.getContent() != null) {
                String c = m.getContent().trim();
                if (!c.isBlank()) {
                    customerMessages++;
                    if (sb.length() > 0) sb.append(" | ");
                    sb.append(c.length() > 140 ? c.substring(0, 140) + "..." : c);
                }
            }
        }

        String title = customerMessages > 0 ? "Ticket client #" + conversation.getId().toString().substring(0, 8) : "Conversation support";

        String summary = "Le client a envoyé " + customerMessages + " message(s). "
            + "Extrait: " + (sb.length() > 300 ? sb.substring(0, 300) + "..." : sb);

        return new EscalationSummaryResponse(
            title,
            summary,
            "OTHER",
            "MEDIUM",
            "NEUTRAL",
            List.of()
        );
    }

    private static String extractJson(String raw) {
        String trimmed = raw.trim();
        int first = trimmed.indexOf('{');
        int last = trimmed.lastIndexOf('}');
        if (first >= 0 && last > first) {
            return trimmed.substring(first, last + 1);
        }
        return trimmed;
    }

    private static String textOr(JsonNode node, String field, String fallback) {
        if (node == null) return fallback;
        JsonNode f = node.get(field);
        if (f == null || f.isNull()) return fallback;
        String s = f.asText();
        return s == null || s.isBlank() ? fallback : s.trim();
    }

    private static String safeTrim(String s, int max) {
        if (s == null) return "";
        String t = s.trim();
        return t.length() > max ? t.substring(0, max) : t;
    }
}
