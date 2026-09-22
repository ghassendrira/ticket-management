package com.example.ragbackend.ai;

import com.example.ragbackend.ai.dto.RagAnswer;
import com.example.ragbackend.ai.dto.SearchResultDto;
import com.example.ragbackend.ai.dto.SourceDto;
import com.example.ragbackend.conversation.ConversationRepository;
import com.example.ragbackend.conversation.MessageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class RagService {

    private static final Logger LOGGER = LoggerFactory.getLogger(RagService.class);

    private static final List<String> GREETINGS = List.of(
        "salut", "bonjour", "bonsoir", "coucou", "hello", "hi", "hey",
        "ca va", "ça va", "comment vas-tu", "comment allez-vous",
        "merci", "au revoir", "bye", "bonne journee", "bonne soiree"
    );

    private static final String NO_ANSWER_MESSAGE_FR =
        "Je ne trouve pas de réponse dans la base documentaire. "
            + "Veuillez reformuler votre question ou demander à être transféré vers un agent humain.";

    private final VectorSearchService vectorSearchService;
    private final ConfidenceCalculator confidenceCalculator;
    private final LlmService llmService;

    @Autowired(required = false)
    private ConversationRepository conversationRepository;

    @Autowired(required = false)
    private MessageRepository messageRepository;

    public RagService(
        VectorSearchService vectorSearchService,
        ConfidenceCalculator confidenceCalculator,
        LlmService llmService
    ) {
        this.vectorSearchService = vectorSearchService;
        this.confidenceCalculator = confidenceCalculator;
        this.llmService = llmService;
    }

    public RagAnswer ask(String question) {
        return answer(question);
    }

    public RagAnswer answer(String question) {
        if (question == null || question.isBlank()) {
            LOGGER.warn("[RagService] answer() appelé avec une question vide");
            return buildNoAnswerResult("Question vide");
        }

        if (isGreeting(question)) {
            LOGGER.info("[RagService] answer() - salutation détectée: {}", question);
            return new RagAnswer(handleGreeting(question), 1.0, List.of(), List.of(), true);
        }

        LOGGER.info("[RagService] answer() - début pipeline RAG (longueur question={})", question.length());

        List<SearchResultDto> relevantChunks = search(question);
        LOGGER.info("[RagService] answer() - {} chunks pertinents trouvés", relevantChunks.size());

        if (relevantChunks.isEmpty()) {
            LOGGER.info("[RagService] answer() - aucun chunk pertinent → refus");
            return buildNoAnswerResult("Aucun chunk pertinent trouvé");
        }

        double confidence = confidenceCalculator.calculate(relevantChunks);
        List<SourceDto> sources = buildSources(relevantChunks);
        double threshold = confidenceCalculator.getSimilarityThreshold();

        if (confidence < threshold) {
            LOGGER.info("[RagService] answer() - confiance {:.3f} < seuil {:.3f} → refus", confidence, threshold);
            return new RagAnswer(
                NO_ANSWER_MESSAGE_FR,
                confidence,
                sources,
                relevantChunks,
                false
            );
        }

        List<String> contextSnippets = buildContextList(relevantChunks);

        String llmAnswer;
        try {
            llmAnswer = llmService.generateAnswer(question, contextSnippets);
        } catch (Exception e) {
            LOGGER.error("[RagService] answer() - échec génération LLM: {}", e.getMessage());
            return buildFallbackFromContext(relevantChunks, sources, confidence);
        }

        if (llmAnswer == null || llmAnswer.isBlank()) {
            LOGGER.warn("[RagService] answer() - réponse LLM vide");
            return buildFallbackFromContext(relevantChunks, sources, confidence);
        }

        if (isLlmRefusing(llmAnswer)) {
            LOGGER.info("[RagService] answer() - LLM indique absence d'information");
            return new RagAnswer(
                NO_ANSWER_MESSAGE_FR,
                confidence * 0.85,
                sources,
                relevantChunks,
                false
            );
        }

        String cleaned = cleanLlmAnswer(llmAnswer);
        LOGGER.info("[RagService] answer() - réponse OK, {} chars, confiance={:.3f}", cleaned.length(), confidence);

        return new RagAnswer(cleaned, confidence, sources, relevantChunks, true);
    }

    public List<SearchResultDto> search(String question) {
        if (question == null || question.isBlank()) {
            return List.of();
        }
        LOGGER.info("[RagService] search() - recherche sémantique, question length={}", question.length());
        List<SearchResultDto> results = vectorSearchService.search(question);
        LOGGER.info("[RagService] search() - {} résultats retournés", results.size());
        return results;
    }

    public String summarizeForEscalation(UUID conversationId) {
        if (conversationId == null) {
            throw new IllegalArgumentException("[RagService] conversationId ne peut pas être null");
        }

        LOGGER.info("[RagService] summarizeForEscalation() - conversationId={}", conversationId);

        if (conversationRepository == null || messageRepository == null) {
            return "[Résumé hors-ligne] Conversation " + conversationId
                + " - Résumé indisponible (repositories conversation/message non injectés).";
        }

        if (!conversationRepository.existsById(conversationId)) {
            LOGGER.warn("[RagService] summarizeForEscalation() - conversation {} introuvable", conversationId);
            return "Conversation introuvable #" + conversationId;
        }

        var messages = messageRepository.findAllByConversationIdOrderByIdAsc(conversationId);

        if (messages == null || messages.isEmpty()) {
            return "Conversation vide - aucun message.";
        }

        List<String> transcript = new ArrayList<>();
        for (var m : messages) {
            String role = m.getRole() == null ? "USER" : m.getRole().toUpperCase();
            String prefix = "ASSISTANT".equals(role) || "SYSTEM".equals(role) ? role : "CLIENT";
            transcript.add(prefix + ": " + (m.getContent() == null ? "" : m.getContent()));
        }

        LOGGER.info("[RagService] summarizeForEscalation() - {} messages à résumer", transcript.size());
        return llmService.generateEscalationSummary(transcript);
    }

    private boolean isGreeting(String question) {
        if (question == null || question.isBlank()) {
            return false;
        }
        String lower = question.toLowerCase(Locale.FRENCH).trim();
        return GREETINGS.stream().anyMatch(lower::contains);
    }

    private String handleGreeting(String question) {
        String lower = question.toLowerCase(Locale.FRENCH);
        if (lower.contains("salut") || lower.contains("bonjour") || lower.contains("hello")
            || lower.contains("bonsoir") || lower.contains("coucou") || lower.contains("hi")
            || lower.contains("hey")) {
            return "Bonjour ! Je suis votre assistant de support. Comment puis-je vous aider aujourd'hui ?";
        }
        if (lower.contains("ca va") || lower.contains("ça va") || lower.contains("comment vas-tu")
            || lower.contains("comment allez-vous")) {
            return "Je vais bien, merci ! Et vous ? Comment puis-je vous aider ?";
        }
        if (lower.contains("merci") || lower.contains("thank")) {
            return "Avec plaisir ! N'hésitez pas si vous avez d'autres questions.";
        }
        if (lower.contains("au revoir") || lower.contains("bye") || lower.contains("bonne journee")
            || lower.contains("bonne soiree")) {
            return "Au revoir ! Passez une excellente journée.";
        }
        return "Bonjour ! Je suis là pour vous aider. Posez-moi vos questions sur nos services.";
    }

    private List<String> buildContextList(List<SearchResultDto> chunks) {
        List<String> result = new ArrayList<>(chunks.size());
        for (SearchResultDto c : chunks) {
            StringBuilder sb = new StringBuilder();
            sb.append("[Source: ").append(c.documentTitle());
            if (c.page() != null) sb.append(", page ").append(c.page());
            if (c.section() != null && !c.section().isBlank()) sb.append(", section: ").append(c.section());
            sb.append(", similarité: ").append(String.format("%.2f", c.similarity()));
            sb.append("]\n");
            sb.append(c.content());
            result.add(sb.toString());
        }
        return result;
    }

    private List<SourceDto> buildSources(List<SearchResultDto> chunks) {
        LinkedHashMap<UUID, SourceDto> seen = new LinkedHashMap<>();
        for (SearchResultDto c : chunks) {
            UUID id = c.documentId();
            if (!seen.containsKey(id)) {
                seen.put(id, new SourceDto(id, c.documentTitle(), c.section(), c.page()));
            }
        }
        return List.copyOf(seen.values());
    }

    private RagAnswer buildNoAnswerResult(String reason) {
        LOGGER.debug("[RagService] Refus - {}", reason);
        return new RagAnswer(NO_ANSWER_MESSAGE_FR, 0.0, List.of(), List.of(), false);
    }

    private RagAnswer buildFallbackFromContext(
        List<SearchResultDto> chunks,
        List<SourceDto> sources,
        double baseConfidence
    ) {
        StringBuilder sb = new StringBuilder();
        sb.append("D'après la documentation disponible :\n\n");
        int limit = Math.min(3, chunks.size());
        for (int i = 0; i < limit; i++) {
            SearchResultDto c = chunks.get(i);
            String snippet = c.content();
            if (snippet.length() > 350) snippet = snippet.substring(0, 350) + "...";
            sb.append("• ").append(snippet).append("\n\n");
        }
        sb.append("Si vous avez besoin d'aide supplémentaire, contactez le support.");

        return new RagAnswer(
            sb.toString(),
            Math.max(0.40, baseConfidence * 0.70),
            sources,
            chunks,
            true
        );
    }

    private boolean isLlmRefusing(String answer) {
        if (answer == null) return true;
        String low = answer.toLowerCase().trim();
        String[] patterns = {
            "je ne trouve pas de réponse", "je ne trouve pas d'information",
            "pas d'information", "information not available",
            "cannot answer", "impossible de répondre", "pas assez d'information",
            "do not have enough information", "ne peut pas répondre",
            "pas dans la documentation", "documentation ne contient pas",
            "n'est pas disponible", "not found in the provided",
            "pas mentionné", "not mentioned"
        };
        for (String p : patterns) {
            if (low.contains(p.toLowerCase())) return true;
        }
        return low.length() < 20;
    }

    private String cleanLlmAnswer(String raw) {
        String cleaned = raw.trim();
        cleaned = cleaned.replaceAll("(?i)selon (le|la|les) (documentation|texte|contexte)[,.:]?\\s*", "");
        cleaned = cleaned.replaceAll("(?i)^(réponse|reponse|answer)\\s*[:：]\\s*", "");
        cleaned = cleaned.replaceAll("(?i)^d'après (le|la|les) (documentation|document(s)?|texte)[,.:]?\\s*", "");
        while (cleaned.startsWith("\n") || cleaned.startsWith(" ")) cleaned = cleaned.substring(1);
        while (cleaned.endsWith("\n") || cleaned.endsWith(" ")) cleaned = cleaned.substring(0, cleaned.length() - 1);
        return cleaned;
    }
}
