package com.example.ragbackend.support;

import com.example.ragbackend.ai.dto.EscalationSummaryResponse;
import com.example.ragbackend.conversation.ConversationEntity;
import com.example.ragbackend.conversation.ConversationRepository;
import com.example.ragbackend.customer.CustomerEntity;
import com.example.ragbackend.customer.CustomerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class SupportEventPublisher {

    private static final Logger LOGGER = LoggerFactory.getLogger(SupportEventPublisher.class);

    private final ApplicationEventPublisher eventPublisher;
    private final ConversationRepository conversationRepository;
    private final CustomerRepository customerRepository;

    public SupportEventPublisher(
        ApplicationEventPublisher eventPublisher,
        ConversationRepository conversationRepository,
        CustomerRepository customerRepository
    ) {
        this.eventPublisher = eventPublisher;
        this.conversationRepository = conversationRepository;
        this.customerRepository = customerRepository;
    }

    public SupportRequestDto publishSupportRequestCreated(
        UUID conversationId,
        EscalationSummaryResponse summary
    ) {
        LOGGER.info("[EVENT support.request.created.v1] publication pour conversation {}", conversationId);

        ConversationEntity conversation = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Conversation introuvable: " + conversationId));

        UUID requestId = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();

        UUID customerId = resolveCustomerId(conversation.getCustomerId());

        SupportRequestDto event = new SupportRequestDto(
            SupportRequestDto.EVENT_VERSION,
            SupportRequestDto.EVENT_TYPE,
            requestId,
            customerId,
            conversationId,
            summary.title(),
            summary.summary(),
            summary.predictedCategory(),
            summary.predictedPriority(),
            summary.sentiment(),
            summary.attemptedSolutions() != null ? summary.attemptedSolutions() : List.of(),
            now
        );

        try {
            eventPublisher.publishEvent(new SupportRequestEvent(event));
            LOGGER.info("[EVENT support.request.created.v1] OK - requestId={}, category={}, priority={}",
                requestId, summary.predictedCategory(), summary.predictedPriority());
        } catch (Exception e) {
            LOGGER.error("[EVENT support.request.created.v1] ECHEC publication: {}", e.getMessage(), e);
        }

        return event;
    }

    private UUID resolveCustomerId(String customerId) {
        if (customerId == null || customerId.isBlank()) {
            return null;
        }
        try {
            UUID uuid = UUID.fromString(customerId);
            return customerRepository.existsById(uuid) ? uuid : null;
        } catch (IllegalArgumentException e) {
            return customerRepository.findByEmail(customerId)
                .map(CustomerEntity::getId)
                .orElse(null);
        }
    }

    public record SupportRequestEvent(SupportRequestDto payload) {}
}
