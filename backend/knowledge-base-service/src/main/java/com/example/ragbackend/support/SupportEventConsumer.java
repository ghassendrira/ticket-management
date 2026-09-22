package com.example.ragbackend.support;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Mock consommateur d'événements de support (version locale sans broker).
 *
 * Dans une architecture réelle: Kafka/RabbitMQ/EventBridge/SNS etc.
 * Ici on utilise un ApplicationEvent + EventListener Spring pour simuler
 * le bus d'événements.
 *
 * Le contrat de l'événement est:
 *   - type: support.request.created
 *   - version: v1
 *   - payload: SupportRequestDto
 */
@Component
public class SupportEventConsumer {

    private static final Logger LOGGER = LoggerFactory.getLogger(SupportEventConsumer.class);
    private static final Logger EVENT_LOGGER = LoggerFactory.getLogger("SUPPORT_EVENTS");

    /**
     * Compteur d'événements reçus pour vérification/dashboard local.
     */
    private volatile long eventsReceived = 0L;

    @Async
    @EventListener
    public void onSupportRequestCreated(SupportEventPublisher.SupportRequestEvent event) {
        SupportRequestDto dto = event.payload();
        eventsReceived++;

        try {
            EVENT_LOGGER.info(
                "[{}#{}] requestId={} | conversationId={} | category={} | priority={} | sentiment={} | title={}",
                dto.eventType(),
                dto.eventVersion(),
                dto.requestId(),
                dto.conversationId(),
                dto.predictedCategory(),
                dto.predictedPriority(),
                dto.sentiment(),
                dto.title()
            );

            dispatchToTicketSystem(dto);

        } catch (Exception e) {
            LOGGER.error("Erreur traitement événement support.request.created.v1 requestId={}: {}",
                dto.requestId(), e.getMessage(), e);
        }
    }

    /**
     * Point d'extension: intégration future avec outil de ticketing réel
     * (Zendesk, Jira Service Management, etc.)
     *
     * Actuellement: mock logger.
     */
    private void dispatchToTicketSystem(SupportRequestDto dto) {
        LOGGER.info(
            "[MOCK-TICKET-SYSTEM] Création ticket via événement {}#{}:"
                + " customerId={}, conversationId={}"
                + " category={}, priority={}, sentiment={}"
                + " solutions tentées={}",
            dto.eventType(), dto.eventVersion(),
            dto.customerId(), dto.conversationId(),
            dto.predictedCategory(), dto.predictedPriority(), dto.sentiment(),
            dto.attemptedSolutions() == null ? 0 : dto.attemptedSolutions().size()
        );
    }

    public long getEventsReceived() {
        return eventsReceived;
    }
}
