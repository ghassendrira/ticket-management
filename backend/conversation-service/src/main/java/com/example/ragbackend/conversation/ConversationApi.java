package com.example.ragbackend.conversation;

import com.example.ragbackend.customer.CustomerContextHolder;
import com.example.ragbackend.document.ChunkEntity;
import com.example.ragbackend.document.ChunkRepository;
import com.example.ragbackend.document.DocumentRepository;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import com.example.ragbackend.customer.CustomerEntity;
import com.example.ragbackend.customer.CustomerRepository;

@RestController
public class ConversationApi {

    private static final Logger LOGGER = LoggerFactory.getLogger(ConversationApi.class);

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final DocumentRepository documentRepository;
    private final ChunkRepository chunkRepository;
    private final CustomerRepository customerRepository;
    
    @Autowired
    private com.example.ragbackend.llm.OllamaService ollamaService;

    public ConversationApi(
        ConversationRepository conversationRepository,
        MessageRepository messageRepository,
        DocumentRepository documentRepository,
        ChunkRepository chunkRepository,
        CustomerRepository customerRepository
    ) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.documentRepository = documentRepository;
        this.chunkRepository = chunkRepository;
        this.customerRepository = customerRepository;
    }

    @PostMapping("/api/conversations")
    @ResponseStatus(HttpStatus.CREATED)
    public ConversationDto createConversation(@Valid @RequestBody(required = false) CreateConversationRequest request) {
        ConversationEntity conversation = new ConversationEntity();
        String customerId = authenticatedCustomerId()
            .orElseGet(() -> request != null && request.customerId() != null && !request.customerId().isBlank()
                ? request.customerId().trim()
                : CustomerContextHolder.getCurrentCustomerId());
        customerId = customerId != null && !customerId.isBlank() ? customerId : "anonymous";

        LOGGER.info("createConversation customerId={}", customerId);

        conversation.setCustomerId(customerId);
        conversation.setStatus("OPEN");
        conversation.setCreatedAt(LocalDateTime.now());
        return toDto(conversationRepository.save(conversation));
    }

    @GetMapping("/api/conversations/{id}")
    public ConversationDto getConversation(@PathVariable UUID id) {
        return toDto(findConversation(id));
    }

    @GetMapping("/api/conversations")
    public List<ConversationDto> listConversations(@RequestParam(required = false) String customerId) {
        String resolvedCustomerId = authenticatedCustomerId()
            .orElseGet(() -> customerId != null && !customerId.isBlank()
                ? customerId.trim()
                : CustomerContextHolder.getCurrentCustomerId());

        LOGGER.info("listConversations resolvedCustomerId={}", resolvedCustomerId);

        List<ConversationEntity> conversations = resolvedCustomerId == null || resolvedCustomerId.isBlank()
            ? conversationRepository.findAllByOrderByCreatedAtDesc()
            : conversationRepository.findAllByCustomerIdOrderByCreatedAtDesc(resolvedCustomerId);

        return conversations.stream().map(this::toDto).toList();
    }

    private java.util.Optional<String> authenticatedCustomerId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
            || authentication.getPrincipal() == null
            || "anonymousUser".equals(authentication.getPrincipal())) {
            return java.util.Optional.empty();
        }

        String email = authentication.getPrincipal().toString().trim().toLowerCase(Locale.ROOT);
        if (email.isBlank()) return java.util.Optional.empty();

        CustomerEntity customer = customerRepository.findByEmail(email).orElseGet(() -> {
            CustomerEntity created = new CustomerEntity();
            created.setId(UUID.nameUUIDFromBytes(("customer:" + email).getBytes(java.nio.charset.StandardCharsets.UTF_8)));
            created.setEmail(email);
            return customerRepository.save(created);
        });
        return java.util.Optional.of(customer.getId().toString());
    }

    @PostMapping("/api/conversations/{id}/messages")
    @Transactional
    public ConversationDto addMessage(@PathVariable UUID id, @Valid @RequestBody AddMessageRequest request) {
        ConversationEntity conversation = findConversation(id);

        MessageEntity message = new MessageEntity();
        message.setConversation(conversation);
        message.setRole(normalizeRole(request.role()));
        message.setContent(request.content().trim());
        message.setConfidence(request.confidence());
        messageRepository.save(message);

        if ("USER".equals(message.getRole())) {
            // === CORRECTION : Chercher INDEXED + ACTIVE ===
            long indexedDocuments = documentRepository.countByStatus("INDEXED");
            long activeDocuments = documentRepository.countByStatus("ACTIVE");
            long totalRelevant = indexedDocuments + activeDocuments;
            
            LOGGER.info("DEBUG - Documents INDEXED: {}, ACTIVE: {}, Total: {}", 
                indexedDocuments, activeDocuments, totalRelevant);

            MessageEntity assistantReply = new MessageEntity();
            assistantReply.setConversation(conversation);
            assistantReply.setRole("ASSISTANT");

            if (totalRelevant > 0) {
                // Charger INDEXED + ACTIVE
                List<com.example.ragbackend.document.DocumentEntity> docs = new ArrayList<>();
                docs.addAll(documentRepository.findAllByStatusOrderByCreatedAtDesc("INDEXED"));
                docs.addAll(documentRepository.findAllByStatusOrderByCreatedAtDesc("ACTIVE"));
                
                LOGGER.info("Documents charges: INDEXED={}, ACTIVE={}", indexedDocuments, activeDocuments);

                String question = message.getContent().toLowerCase(Locale.ROOT);
                String[] tokens = question.split("\\W+");
                List<String> tokenList = new ArrayList<>();
                for (String t : tokens) {
                    if (t != null && t.length() > 2) tokenList.add(t);
                }

                double bestRelevance = 0.0;
                List<String> contexts = new ArrayList<>();
                
                for (com.example.ragbackend.document.DocumentEntity d : docs) {
                    String hay = ((d.getTitle() == null ? "" : d.getTitle()) + " " + 
                        (d.getFilePath() == null ? "" : d.getFilePath())).toLowerCase(Locale.ROOT);
                    int match = 0;
                    for (String t : tokenList) {
                        if (hay.contains(t)) match++;
                    }
                    double rel = tokenList.size() > 0 ? ((double) match) / tokenList.size() : 0.0;
                    if (rel > bestRelevance) {
                        bestRelevance = rel;
                    }
                    if (rel > 0) {
                        contexts.add(d.getTitle() == null ? d.getFilePath() : d.getTitle());
                    }

                    // === CORRECTION : Utiliser findAllByDocument_Id (avec underscore) ===
                    List<ChunkEntity> chunks = chunkRepository.findAllByDocumentIdOrderByPageNumber(d.getId());
                    if (!chunks.isEmpty()) {
                        LOGGER.info("Document {} a {} chunks", d.getId(), chunks.size());
                        for (ChunkEntity chunk : chunks) {
                            String chunkText = chunk.getContent() == null ? "" : chunk.getContent();
                            if (!chunkText.isBlank()) {
                                contexts.add(chunkText);
                            }
                        }
                    }
                }

                float confidence = (float) Math.min(0.95, 0.3 + bestRelevance * 0.7);

                if (confidence < 0.4f || contexts.isEmpty()) {
                    // PAS assez de contexte -> fallback LLM
                    String llm = null;
                    if (this.ollamaService != null) {
                        llm = this.ollamaService.generateGeneralAnswer(question);
                    } else {
                        llm = "Aucune information specifique trouvee pour: " + question;
                    }
                    assistantReply.setContent(llm);
                    assistantReply.setConfidence(confidence);
                    assistantReply.setIsFallbackGeneral(true);
                    conversation.setStatus("OPEN");
                } else {
                    // RAG path
                    String rag = null;
                    if (this.ollamaService != null) {
                        rag = this.ollamaService.generateRagAnswer(question, contexts);
                    } else {
                        rag = "Documents pertinents trouves. Nombre de contextes: " + contexts.size();
                    }
                    assistantReply.setContent(rag);
                    assistantReply.setConfidence(confidence);
                    assistantReply.setIsFallbackGeneral(false);
                    conversation.setStatus("RESOLVED");
                }
            } else {
                assistantReply.setConfidence(0.2f);
                assistantReply.setContent(
                    "Votre message a ete enregistre, mais aucun document indexe n'est encore disponible."
                );
                assistantReply.setIsFallbackGeneral(false);
                conversation.setStatus("OPEN");
            }

            messageRepository.save(assistantReply);
        }

        conversationRepository.save(conversation);
        return toDto(conversation);
    }

    @PostMapping("/api/messages/{id}/feedback")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void submitFeedback(@PathVariable UUID id, @Valid @RequestBody FeedbackRequest request) {
        MessageEntity message = messageRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Message introuvable"));

        if (message.getConfidence() == null) {
            return;
        }

        if ("UP".equalsIgnoreCase(request.value())) {
            message.setConfidence(Math.min(1.0f, message.getConfidence() + 0.05f));
        } else if ("DOWN".equalsIgnoreCase(request.value())) {
            message.setConfidence(Math.max(0.0f, message.getConfidence() - 0.1f));
        }

        messageRepository.save(message);
    }

    private ConversationEntity findConversation(UUID id) {
        return conversationRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation introuvable"));
    }

    private ConversationDto toDto(ConversationEntity conversation) {
        List<MessageDto> messages = messageRepository.findAllByConversationIdOrderByCreatedAtAscIdAsc(conversation.getId()).stream()
            .map(this::toDto)
            .toList();

        return new ConversationDto(
            conversation.getId(),
            conversation.getCustomerId(),
            conversation.getStatus(),
            conversation.getCreatedAt(),
            messages
        );
    }

    private MessageDto toDto(MessageEntity message) {
        return new MessageDto(
            message.getId(), 
            message.getRole(), 
            message.getContent(), 
            message.getConfidence(), 
            message.getIsFallbackGeneral() == null ? Boolean.FALSE : message.getIsFallbackGeneral(),
            message.getCreatedAt()
        );
    }

    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            return "USER";
        }
        return role.trim().toUpperCase(Locale.ROOT);
    }
}