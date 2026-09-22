package com.example.ragbackend.ai;

import com.example.ragbackend.ai.dto.SearchResultDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Calcule un score de confiance simple et explicable basé sur la similarité sémantique.
 *
 * Formule documentée:
 *   - avgSimilarity: moyenne des scores de similarité des chunks pertinents (0.0 - 1.0)
 *   - chunksAboveThreshold: nombre de chunks avec similarité >= seuil configuré
 *   - topK: nombre maximum de chunks demandés
 *
 *   confidence = min(1.0, avgSimilarity * 0.6 + (chunksAboveThreshold / topK) * 0.4)
 *
 * Interprétation:
 *   - 60% du poids = qualité moyenne des résultats (moyenne similarité)
 *   - 40% du poids = quantité de résultats pertinents (cohérence multi-sources)
 *
 * Cas limites:
 *   - 0 chunks: retourne 0.1 (confiance très faible)
 *   - Seulement 1 chunk au-dessus du seuil: pénalisé légèrement
 *   - Plusieurs chunks similaires au-dessus du seuil: confiance élevée
 */
@Component
public class ConfidenceCalculator {

    private static final Logger LOGGER = LoggerFactory.getLogger(ConfidenceCalculator.class);

    private final double similarityThreshold;
    private final int configuredTopK;

    public ConfidenceCalculator(
        @Value("${rag.similarity-threshold:0.70}") double similarityThreshold,
        @Value("${rag.top-k:5}") int configuredTopK
    ) {
        this.similarityThreshold = similarityThreshold;
        this.configuredTopK = Math.max(1, configuredTopK);
    }

    public double calculate(List<SearchResultDto> retrievedChunks) {
        return calculate(retrievedChunks, configuredTopK, similarityThreshold);
    }

    public double calculate(List<SearchResultDto> retrievedChunks, int effectiveTopK, double threshold) {
        if (retrievedChunks == null || retrievedChunks.isEmpty()) {
            LOGGER.debug("Confiance: aucun chunk pertinent -> 0.10");
            return 0.10;
        }

        int topK = Math.max(1, effectiveTopK);

        double avgSimilarity = retrievedChunks.stream()
            .mapToDouble(SearchResultDto::similarity)
            .average()
            .orElse(0.0);

        long chunksAboveThreshold = retrievedChunks.stream()
            .filter(c -> c.similarity() >= threshold)
            .count();

        boolean bestChunkExceedsThreshold = retrievedChunks.stream()
            .findFirst()
            .map(c -> c.similarity() >= threshold)
            .orElse(false);

        double ratioAbove = (double) chunksAboveThreshold / (double) topK;
        ratioAbove = Math.min(1.0, ratioAbove);

        double rawConfidence = (avgSimilarity * 0.6) + (ratioAbove * 0.4);

        if (!bestChunkExceedsThreshold) {
            rawConfidence *= 0.75;
        }

        double confidence = Math.min(1.0, rawConfidence);
        confidence = Math.max(0.0, confidence);

        LOGGER.debug(
            "Confiance calculée: avgSim={:.3f}, aboveThreshold={}/{}, ratioAbove={:.3f}, bestExceeds={}, confiance={:.3f}",
            avgSimilarity, chunksAboveThreshold, topK, ratioAbove, bestChunkExceedsThreshold, confidence
        );

        return round3(confidence);
    }

    public double getSimilarityThreshold() {
        return similarityThreshold;
    }

    public int getConfiguredTopK() {
        return configuredTopK;
    }

    private static double round3(double v) {
        return Math.round(v * 1000.0) / 1000.0;
    }
}
