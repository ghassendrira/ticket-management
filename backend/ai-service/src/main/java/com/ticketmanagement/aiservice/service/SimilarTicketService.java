package com.ticketmanagement.aiservice.service;

import com.ticketmanagement.aiservice.dto.SimilarTicketResponse;
import com.ticketmanagement.aiservice.entity.TicketEmbedding;
import com.ticketmanagement.aiservice.repository.TicketEmbeddingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
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
    private final JdbcTemplate jdbcTemplate;

    @Value("${ai.similarity.threshold:0.70}")
    private double similarityThreshold;

    @Value("${ai.similarity.max-results:5}")
    private int maxResults;

    public SimilarTicketService(OllamaService ollamaService,
                                TicketEmbeddingRepository embeddingRepository,
                                JdbcTemplate jdbcTemplate) {
        this.ollamaService = ollamaService;
        this.embeddingRepository = embeddingRepository;
        this.jdbcTemplate = jdbcTemplate;
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
        String vectorString = toVectorString(embeddingList);

        String sql = """
            SELECT 
                ticket_id,
                CAST(1 - (embedding <=> ?::vector(768)) AS double precision) AS similarity,
                resolution_summary
            FROM ticket_embeddings
            WHERE status IN ('RESOLVED', 'CLOSED')
              AND ticket_id != ?::uuid
            ORDER BY embedding <=> ?::vector(768)
            LIMIT ?
            """;

        List<SimilarTicketResponse> results = jdbcTemplate.query(
                sql,
                (rs, rowNum) -> {
                    double similarity = rs.getDouble("similarity");
                    similarity = Math.max(0.0, Math.min(1.0, similarity));
                    return new SimilarTicketResponse(
                            UUID.fromString(rs.getString("ticket_id")),
                            similarity,
                            rs.getString("resolution_summary")
                    );
                },
                vectorString,
                currentTicketId.toString(),
                vectorString,
                maxResults
        );

        return results.stream()
                .filter(r -> r.similarityScore() >= similarityThreshold)
                .toList();
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