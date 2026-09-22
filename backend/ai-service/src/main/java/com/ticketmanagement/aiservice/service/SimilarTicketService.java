package com.ticketmanagement.aiservice.service;

import com.ticketmanagement.aiservice.dto.SimilarTicketResponse;
import com.ticketmanagement.aiservice.entity.TicketEmbedding;
import com.ticketmanagement.aiservice.repository.TicketEmbeddingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class SimilarTicketService {

    private static final Logger log = LoggerFactory.getLogger(SimilarTicketService.class);

    private final OllamaService ollamaService;
    private final TicketEmbeddingRepository embeddingRepository;

    @Value("${ai.similarity.threshold:0.70}")
    private double similarityThreshold;

    @Value("${ai.similarity.max-results:5}")
    private int maxResults;

    public SimilarTicketService(OllamaService ollamaService,
                                TicketEmbeddingRepository embeddingRepository) {
        this.ollamaService = ollamaService;
        this.embeddingRepository = embeddingRepository;
    }

    @Transactional
    public void storeEmbedding(UUID ticketId, String ticketContent, String resolutionSummary) {
        log.info("Generating embedding for resolved ticket: {}", ticketId);

        String combinedContent = buildCombinedContent(ticketContent, resolutionSummary);
        List<Double> embeddingList = ollamaService.generateEmbedding(combinedContent);
        float[] embeddingArray = toFloatArray(embeddingList);

        TicketEmbedding entity = new TicketEmbedding();
        entity.setTicketId(ticketId);
        entity.setResolutionSummary(resolutionSummary);
        entity.setStatus("RESOLVED");
        entity.setEmbedding(embeddingArray);
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());

        embeddingRepository.save(entity);
        log.info("Embedding stored successfully for ticket: {}", ticketId);
    }

    @Transactional(readOnly = true)
    public List<SimilarTicketResponse> findSimilarTickets(UUID currentTicketId, String ticketContent) {
        log.info("Searching similar resolved tickets for: {}", currentTicketId);

        List<Double> embeddingList = ollamaService.generateEmbedding(ticketContent);
        float[] queryEmbedding = toFloatArray(embeddingList);

        List<TicketEmbedding> allEmbeddings = embeddingRepository.findAllByStatusIn(List.of("RESOLVED", "CLOSED"));

        return allEmbeddings.stream()
                .filter(e -> !e.getTicketId().equals(currentTicketId))
                .map(e -> {
                    float[] storedEmbedding = e.getEmbedding();
                    double similarity = cosineSimilarity(queryEmbedding, storedEmbedding);
                    return new SimilarTicketResponse(e.getTicketId(), similarity, e.getResolutionSummary());
                })
                .filter(r -> r.similarityScore() >= similarityThreshold)
                .sorted((a, b) -> Double.compare(b.similarityScore(), a.similarityScore()))
                .limit(maxResults)
                .toList();
    }

    private double cosineSimilarity(float[] a, float[] b) {
        if (a.length != b.length) {
            return 0.0;
        }
        double dotProduct = 0.0;
        double normA = 0.0;
        double normB = 0.0;
        for (int i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA == 0.0 || normB == 0.0) {
            return 0.0;
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private String buildCombinedContent(String ticketContent, String resolutionSummary) {
        return """
            Ticket Content:
            %s

            Resolution Summary:
            %s
            """.formatted(ticketContent, resolutionSummary);
    }

    private float[] toFloatArray(List<Double> list) {
        float[] array = new float[list.size()];
        for (int i = 0; i < list.size(); i++) {
            array[i] = list.get(i).floatValue();
        }
        return array;
    }

    private String toVectorString(List<Double> list) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) sb.append(",");
            sb.append(list.get(i).floatValue());
        }
        sb.append("]");
        return sb.toString();
    }
}