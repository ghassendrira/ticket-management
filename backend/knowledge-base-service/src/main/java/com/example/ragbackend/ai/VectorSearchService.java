package com.example.ragbackend.ai;

import com.example.ragbackend.ai.dto.SearchResultDto;
import com.example.ragbackend.document.ChunkRepository;
import com.example.ragbackend.document.DocumentEntity;
import com.example.ragbackend.document.DocumentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class VectorSearchService {

    private static final Logger LOGGER = LoggerFactory.getLogger(VectorSearchService.class);

    private final ChunkRepository chunkRepository;
    private final DocumentRepository documentRepository;
    private final EmbeddingService embeddingService;
    private final int topK;
    private final double similarityThreshold;

    public VectorSearchService(
        ChunkRepository chunkRepository,
        DocumentRepository documentRepository,
        EmbeddingService embeddingService,
        @Value("${rag.top-k:5}") int topK,
        @Value("${rag.similarity-threshold:0.70}") double similarityThreshold
    ) {
        this.chunkRepository = chunkRepository;
        this.documentRepository = documentRepository;
        this.embeddingService = embeddingService;
        this.topK = Math.max(1, topK);
        this.similarityThreshold = similarityThreshold;
        LOGGER.info("VectorSearchService: topK={}, similarityThreshold={}", this.topK, this.similarityThreshold);
    }

    public List<SearchResultDto> search(String question) {
        return search(question, topK, similarityThreshold);
    }

    public List<SearchResultDto> search(String question, int topK, double threshold) {
        if (question == null || question.isBlank()) {
            return List.of();
        }

        int effectiveK = Math.max(1, topK);
        LOGGER.info("Vector search: question length={}, topK={}, threshold={}",
            question.length(), effectiveK, threshold);

        float[] questionEmbedding = embeddingService.embed(question);
        LOGGER.debug("Question embedding generated: dim={}", questionEmbedding.length);

        List<Object[]> raw = chunkRepository.findSimilarChunks(
            questionEmbedding,
            threshold,
            effectiveK
        );

        if (raw == null || raw.isEmpty()) {
            LOGGER.info("Aucun chunk pertinent trouvé (seuil={})", threshold);
            return List.of();
        }

        Set<UUID> documentIds = new HashSet<>();
        for (Object[] row : raw) {
            Object docId = row[1];
            if (docId instanceof UUID id) documentIds.add(id);
        }

        Map<UUID, String> documentTitles = new HashMap<>();
        if (!documentIds.isEmpty()) {
            List<DocumentEntity> docs = documentRepository.findAllById(documentIds);
            for (DocumentEntity d : docs) {
                documentTitles.put(d.getId(), d.getTitle());
            }
        }

        List<SearchResultDto> results = new ArrayList<>(raw.size());
        for (Object[] row : raw) {
            try {
                SearchResultDto dto = mapRow(row, documentTitles);
                if (dto != null) {
                    results.add(dto);
                }
            } catch (Exception e) {
                LOGGER.warn("Erreur mapping row de résultat de recherche: {}", e.getMessage());
            }
        }

        LOGGER.info("{} résultats pertinents retournés (sur {} brut)", results.size(), raw.size());
        return List.copyOf(results);
    }

    private SearchResultDto mapRow(Object[] row, Map<UUID, String> titles) {
        if (row == null || row.length < 7) return null;

        UUID chunkId = row[0] instanceof UUID ? (UUID) row[0] : null;
        UUID documentId = row[1] instanceof UUID ? (UUID) row[1] : null;
        String content = row[2] != null ? row[2].toString() : "";
        Integer pageNumber = null;
        if (row[3] instanceof Number n) pageNumber = n.intValue();
        else if (row[3] != null) {
            try { pageNumber = Integer.parseInt(row[3].toString()); } catch (Exception ignored) {}
        }
        Integer chunkOrder = null;
        if (row[4] instanceof Number n) chunkOrder = n.intValue();
        else if (row[4] != null) {
            try { chunkOrder = Integer.parseInt(row[4].toString()); } catch (Exception ignored) {}
        }
        String section = row[5] != null ? row[5].toString() : null;
        double similarity = 0.0;
        if (row[6] instanceof Number n) similarity = n.doubleValue();
        else if (row[6] != null) {
            try { similarity = Double.parseDouble(row[6].toString()); } catch (Exception ignored) {}
        }

        if (documentId == null || content.isBlank()) return null;

        String title = titles.getOrDefault(documentId, "Document #" + documentId);

        return new SearchResultDto(documentId, title, pageNumber, section, content, similarity);
    }

    public int getTopK() {
        return topK;
    }

    public double getSimilarityThreshold() {
        return similarityThreshold;
    }
}
