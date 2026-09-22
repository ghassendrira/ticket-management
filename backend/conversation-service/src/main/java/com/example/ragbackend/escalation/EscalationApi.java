package com.example.ragbackend.escalation;

import com.example.ragbackend.category.CategoryEntity;
import com.example.ragbackend.category.CategoryRepository;
import com.example.ragbackend.conversation.ConversationEntity;
import com.example.ragbackend.conversation.ConversationRepository;
import com.example.ragbackend.conversation.MessageEntity;
import com.example.ragbackend.conversation.MessageRepository;
import com.example.ragbackend.integration.ai.AiServiceClient;
import com.example.ragbackend.integration.ai.AiServiceClient.AiClassificationResponse;
import com.example.ragbackend.integration.ai.AiServiceClient.AiPriorityResponse;
import com.example.ragbackend.integration.ticket.TicketClient;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@RestController
public class EscalationApi {

    private static final Logger LOGGER = LoggerFactory.getLogger(EscalationApi.class);
    private static final Set<String> VALID_TICKET_CATEGORIES = Set.of(
        "ACCOUNT_ACCESS", "BILLING", "TECHNICAL", "ORDER", "DELIVERY", "SECURITY", "INFORMATION"
    );
    private static final Set<String> VALID_TICKET_PRIORITIES = Set.of(
        "LOW", "MEDIUM", "HIGH", "CRITICAL"
    );

    private final EscalationRepository escalationRepository;
    private final ConversationRepository conversationRepository;
    private final CategoryRepository categoryRepository;
    private final MessageRepository messageRepository;
    private final TicketClient ticketClient;
    private final AiServiceClient aiServiceClient;

    public EscalationApi(
        EscalationRepository escalationRepository,
        ConversationRepository conversationRepository,
        CategoryRepository categoryRepository,
        MessageRepository messageRepository,
        TicketClient ticketClient,
        AiServiceClient aiServiceClient
    ) {
        this.escalationRepository = escalationRepository;
        this.conversationRepository = conversationRepository;
        this.categoryRepository = categoryRepository;
        this.messageRepository = messageRepository;
        this.ticketClient = ticketClient;
        this.aiServiceClient = aiServiceClient;
    }

    @GetMapping("/api/conversations/{id}/prepare-escalation")
    public ResponseEntity<PrepareEscalationResponse> prepareEscalation(@PathVariable UUID id) {
        LOGGER.info("[EscalationApi] prepare-escalation conversationId={}", id);

        ConversationEntity conversation = conversationRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation introuvable"));

        List<MessageEntity> messages = messageRepository.findAllByConversationIdOrderByCreatedAtAscIdAsc(id);
        String title = buildEscalationTitle(conversation, messages);
        String transcript = buildEscalationSummary(conversation, messages);
        String summary = aiServiceClient.generateSummary(title, transcript).orElse(transcript);
        Optional<AiClassificationResponse> classification = aiServiceClient.classifyQuick(title, summary);
        String category = classification.map(response -> normalizeCategory(response.category()))
            .orElse("INFORMATION");
        Optional<AiPriorityResponse> priority = aiServiceClient.estimatePriority(title, summary, category);
        String priorityValue = priority.map(response -> normalizePriority(response.priorityLevel()))
            .orElse("MEDIUM");

        PrepareEscalationResponse response = new PrepareEscalationResponse(
            category,
            classification.map(AiClassificationResponse::category).orElse("INFORMATION"),
            classification.map(AiClassificationResponse::confidence).orElse(0.0),
            priorityValue,
            title,
            summary,
            true,
            null,
            categoryRepository.findByNameIgnoreCase(category).map(CategoryEntity::getId).orElse(null)
        );

        LOGGER.info("[EscalationApi] prepare-escalation OK conversationId={}", id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/conversations/{id}/escalate")
    @Transactional
    @ResponseStatus(HttpStatus.CREATED)
    public EscalationIdDto createEscalation(
        @PathVariable UUID id,
        @Valid @RequestBody CreateEscalationRequest request
    ) {
        ConversationEntity conversation = conversationRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation introuvable"));

        String title = request.title().trim();
        String summary = request.description() != null && !request.description().isBlank()
            ? request.description().trim()
            : request.summary() == null ? "" : request.summary().trim();

        String ticketCategory;
        String ticketPriority;
        CategoryEntity categoryEntity;

        if (request.categoryId() != null) {
            categoryEntity = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Categorie introuvable"));
            ticketCategory = normalizeCategory(mapCategoryToTicket(categoryEntity.getName()));
        } else {
            Optional<AiClassificationResponse> classification = aiServiceClient.classifyQuick(title, summary);
            ticketCategory = classification.map(response -> normalizeCategory(response.category()))
                .orElse("INFORMATION");
            categoryEntity = categoryRepository.findByNameIgnoreCase(ticketCategory)
                .orElseGet(() -> fallbackCategoryEntity());
        }

        if (request.priority() != null && !request.priority().isBlank()) {
            ticketPriority = normalizePriority(mapPriorityToTicket(request.priority().trim()));
        } else {
            Optional<AiPriorityResponse> priorityResp = aiServiceClient.estimatePriority(title, summary, ticketCategory);
            ticketPriority = priorityResp.map(response -> normalizePriority(response.priorityLevel()))
                .orElse("MEDIUM");
        }

        EscalationEntity escalation = new EscalationEntity();
        escalation.setConversation(conversation);
        escalation.setCategory(categoryEntity);
        escalation.setTitle(title);
        escalation.setSummary(summary);
        escalation.setPriority(ticketPriority);
        escalation.setStatus(request.status() == null || request.status().isBlank()
            ? "SUBMITTED"
            : request.status().trim().toUpperCase(Locale.ROOT));

        conversation.setStatus("ESCALATED");
        conversationRepository.save(conversation);

        EscalationEntity saved = escalationRepository.save(escalation);
        String requestId = request.requestId() != null && !request.requestId().isBlank()
            ? request.requestId().trim()
            : "CONV-" + conversation.getId();
        String ticketId = null;
        String ticketStatus = null;

        try {
            Map<String, Object> ticketRequest = new HashMap<>();
            ticketRequest.put("title", title);
            ticketRequest.put("description", summary);
            ticketRequest.put("requestId", requestId);
            ticketRequest.put("category", ticketCategory);
            ticketRequest.put("priority", ticketPriority);
            ticketRequest.put("customerId", conversation.getCustomerId());
            ticketRequest.put("conversationId", conversation.getId().toString());

            Map<String, Object> ticketResponse = ticketClient.createTicket(
                ticketRequest,
                "system",
                "ADMIN"
            );

            if (ticketResponse != null && ticketResponse.containsKey("id")) {
                ticketId = ticketResponse.get("id").toString();
                ticketStatus = ticketResponse.get("status") == null
                    ? "NEW"
                    : ticketResponse.get("status").toString();
                conversation.setSupportTicketId(ticketId);
                conversation.setSupportTicketStatus(ticketStatus);
                conversationRepository.save(conversation);
            }
        } catch (Exception e) {
            LOGGER.error("[EscalationApi] Echec creation ticket pour escalation {}: {}", saved.getId(), e.getMessage());
        }

        return new EscalationIdDto(saved.getId(), ticketId, requestId, ticketStatus,
            ticketId == null ? "Escalade creee, mais le ticket TicketFlow est indisponible." : null);
    }

    private CategoryEntity fallbackCategoryEntity() {
        return categoryRepository.findByNameIgnoreCase("INFORMATION")
            .orElseGet(() -> categoryRepository.findAll().stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Aucune categorie disponible dans la base de donnees.")));
    }

    private String normalizeCategory(String raw) {
        if (raw == null) return "INFORMATION";
        String up = raw.trim().toUpperCase(Locale.ROOT)
            .replace(" ", "_").replace("-", "_");
        if (up.equals("ACCOUNT")) up = "ACCOUNT_ACCESS";
        if (up.equals("PRODUCT_INFO") || up.equals("OTHER")) up = "INFORMATION";
        return VALID_TICKET_CATEGORIES.contains(up) ? up : "INFORMATION";
    }

    private String normalizePriority(String raw) {
        if (raw == null) return "MEDIUM";
        String up = raw.trim().toUpperCase(Locale.ROOT);
        if (up.equals("URGENT")) up = "CRITICAL";
        if (up.equals("BASSE")) up = "LOW";
        if (up.equals("MOYENNE")) up = "MEDIUM";
        if (up.equals("HAUTE")) up = "HIGH";
        return VALID_TICKET_PRIORITIES.contains(up) ? up : "MEDIUM";
    }

    private String mapCategoryToTicket(String categoryName) {
        if (categoryName == null) return "INFORMATION";
        return switch (categoryName.toUpperCase()) {
            case "TECHNICAL" -> "TECHNICAL";
            case "BILLING" -> "BILLING";
            case "ACCOUNT", "ACCOUNT_ACCESS" -> "ACCOUNT_ACCESS";
            case "PRODUCT_INFO", "OTHER" -> "INFORMATION";
            default -> "INFORMATION";
        };
    }

    private String mapPriorityToTicket(String priority) {
        if (priority == null) return "MEDIUM";
        return switch (priority.toUpperCase()) {
            case "LOW", "BASSE" -> "LOW";
            case "MEDIUM", "MOYENNE" -> "MEDIUM";
            case "HIGH", "HAUTE" -> "HIGH";
            case "URGENT", "CRITICAL" -> "CRITICAL";
            default -> "MEDIUM";
        };
    }

    private String buildEscalationTitle(ConversationEntity conversation, List<MessageEntity> messages) {
        if (messages.isEmpty()) return "Conversation support #" + conversation.getId().toString().substring(0, 8);
        String first = messages.get(0).getContent();
        if (first == null || first.isBlank()) return "Ticket client";
        String t = first.trim().replaceAll("\\s+", " ");
        return t.length() > 120 ? t.substring(0, 120) : t;
    }

    private String buildEscalationSummary(ConversationEntity conversation, List<MessageEntity> messages) {
        if (messages.isEmpty()) return "Aucun message echange.";
        StringBuilder sb = new StringBuilder();
        sb.append("Resume de la conversation:\n\n");
        List<MessageEntity> last = messages.size() > 8 ? messages.subList(messages.size() - 8, messages.size()) : messages;
        for (MessageEntity m : last) {
            String role = "ASSISTANT".equalsIgnoreCase(m.getRole()) ? "Assistant" : "Client";
            String content = m.getContent() == null ? "" : m.getContent().trim();
            if (content.length() > 400) content = content.substring(0, 400) + "...";
            sb.append(role).append(": ").append(content).append("\n\n");
        }
        return sb.toString().trim();
    }

    @GetMapping("/api/escalations")
    public List<EscalationDto> listEscalations() {
        return escalationRepository.findAllByOrderByIdDesc().stream()
            .map(this::toDto)
            .toList();
    }

    private EscalationDto toDto(EscalationEntity escalation) {
        return new EscalationDto(
            escalation.getId(),
            escalation.getConversation().getId(),
            escalation.getCategory().getId(),
            escalation.getTitle(),
            escalation.getSummary(),
            escalation.getPriority(),
            escalation.getStatus()
        );
    }
}

record CreateEscalationRequest(
    @NotBlank String title,
    String summary,
    String description,
    UUID conversationId,
    String requestId,
    String priority,
    java.util.UUID categoryId,
    String status
) {
}

record EscalationIdDto(
    UUID id,
    String ticketId,
    String requestId,
    String ticketStatus,
    String message
) {
}

record EscalationDto(
    UUID id,
    UUID conversationId,
    UUID categoryId,
    String title,
    String summary,
    String priority,
    String status
) {
}

record PrepareEscalationResponse(
    String category,
    String aiCategoryRaw,
    Double categoryConfidence,
    String priority,
    String title,
    String summary,
    boolean aiAnalysisSuccess,
    String errorMessage,
    UUID categoryId
) {
    PrepareEscalationResponse withCategoryId(UUID id) {
        return new PrepareEscalationResponse(
            this.category, this.aiCategoryRaw, this.categoryConfidence,
            this.priority, this.title, this.summary,
            this.aiAnalysisSuccess, this.errorMessage, id
        );
    }
}
