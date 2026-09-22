package com.example.ragbackend.ai;

import com.example.ragbackend.ai.dto.SearchResultDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("ConfidenceCalculator Tests")
class ConfidenceCalculatorTest {

    private static final double THRESHOLD = 0.70;
    private static final int TOP_K = 5;

    private ConfidenceCalculator calculator;

    @BeforeEach
    void setUp() {
        calculator = new ConfidenceCalculator(THRESHOLD, TOP_K);
    }

    @Test
    @DisplayName("calculate() - liste vide = 0.10 (confiance très faible)")
    void calculate_emptyChunks_returnsLow() {
        double c = calculator.calculate(List.of());
        assertEquals(0.10, c, 0.001);
    }

    @Test
    @DisplayName("calculate() - 5 chunks parfaits (similarité 1.0) → confiance ~1.0")
    void calculate_allPerfectChunks_near1() {
        List<SearchResultDto> chunks = buildChunks(5, 0.99, THRESHOLD);
        double c = calculator.calculate(chunks);

        assertTrue(c > 0.85, "5 chunks très similaires → confiance élevée, obtenu: " + c);
        assertTrue(c <= 1.0, "La confiance ne doit jamais excéder 1.0");
    }

    @Test
    @DisplayName("calculate() - 1 chunk juste au-dessus seuil → confiance modérée")
    void calculate_1ChunkJustAboveThreshold_moderate() {
        List<SearchResultDto> chunks = buildChunks(1, 0.71, THRESHOLD);
        double c = calculator.calculate(chunks);
        assertTrue(c < 0.80, "Un seul chunk → pénalité, obtenu: " + c);
        assertTrue(c > 0.20);
    }

    @Test
    @DisplayName("calculate() - 1 chunk sous seuil → pénalisé (coef 0.75 appliqué)")
    void calculate_bestChunkBelowThreshold_penalized() {
        List<SearchResultDto> below = buildChunks(1, 0.50, THRESHOLD);
        double cBelow = calculator.calculate(below);

        List<SearchResultDto> above = buildChunks(1, 0.80, THRESHOLD);
        double cAbove = calculator.calculate(above);

        assertTrue(cBelow < cAbove,
            "Un chunk sous le seuil doit être moins confiant qu'au-dessus");
    }

    @Test
    @DisplayName("calculate() - plusieurs chunks au-dessus → plus confiant que 1 seul")
    void calculate_manyAboveThreshold_moreConfident() {
        List<SearchResultDto> oneChunk = buildChunks(1, 0.90, THRESHOLD);
        List<SearchResultDto> fiveChunks = buildChunks(5, 0.90, THRESHOLD);

        double c1 = calculator.calculate(oneChunk);
        double c5 = calculator.calculate(fiveChunks);

        assertTrue(c5 > c1, "Plusieurs chunks = plus confiant que 1 seul, "
            + "c1=" + c1 + " c5=" + c5);
    }

    @Test
    @DisplayName("calculate() - respecte la formule documentée: avgSim*0.6 + ratioAbove*0.4")
    void calculate_formulaMatches() {
        double avgSim = 0.90;
        double ratio = 1.0;
        double expectedUnclamped = avgSim * 0.6 + ratio * 0.4;
        double expected = Math.min(1.0, expectedUnclamped);

        List<SearchResultDto> chunks = buildChunks(5, avgSim, THRESHOLD);
        double actual = calculator.calculate(chunks, 5, THRESHOLD);

        assertEquals(expected, actual, 0.05,
            "La formule doit correspondre: attendu ~" + expected + " obtenu " + actual);
    }

    @Test
    @DisplayName("calculate() - retour est toujours dans [0.0, 1.0]")
    void calculate_outputAlwaysBounded() {
        double[][] scenarios = new double[][]{
            {0.00, 0}, {1.00, 5}, {0.50, 1}, {0.99, 50}, {0.30, 2}
        };
        for (double[] s : scenarios) {
            int count = (int) s[1];
            double sim = s[0];
            List<SearchResultDto> c = buildChunks(count, sim, THRESHOLD);
            double conf = calculator.calculate(c);
            assertTrue(conf >= 0.0 && conf <= 1.0,
                "Hors bornes pour sim=" + sim + " count=" + count + " → conf=" + conf);
        }
    }

    @Test
    @DisplayName("getters: retournent bien les valeurs configurées")
    void getters_returnConfigured() {
        assertEquals(THRESHOLD, calculator.getSimilarityThreshold());
        assertEquals(TOP_K, calculator.getConfiguredTopK());
    }

    private List<SearchResultDto> buildChunks(int count, double similarity, double threshold) {
        java.util.ArrayList<SearchResultDto> list = new java.util.ArrayList<>();
        for (int i = 0; i < count; i++) {
            double sim = similarity - (i * 0.01);
            list.add(new SearchResultDto(
                UUID.randomUUID(),
                "Doc " + i,
                (i % 5) + 1,
                "Section " + i,
                "Contenu texte du chunk " + i + " avec une similarité fixe pour le test.",
                sim
            ));
        }
        return list;
    }
}
