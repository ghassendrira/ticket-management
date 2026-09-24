package com.example.ragbackend.ai;

import com.example.ragbackend.ai.dto.RagAnswer;
import com.example.ragbackend.ai.dto.SearchResultDto;
import com.example.ragbackend.ai.dto.SourceDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("RagService Tests")
class RagServiceTest {

    @Mock
    private VectorSearchService vectorSearchService;

    @Mock
    private ConfidenceCalculator confidenceCalculator;

    @Mock
    private LlmService llmService;

    private RagService ragService;

    private UUID docPasswordGuide;

    @BeforeEach
    void setUp() {
        ragService = new RagService(vectorSearchService, confidenceCalculator, llmService);
        docPasswordGuide = UUID.randomUUID();
    }

    @Test
    @DisplayName("answer() - salutation → réponse directe sans recherche vectorielle")
    void answer_greeting_returnsDirectResponse() {
        RagAnswer a = ragService.answer("bonjour");

        assertTrue(a.answered());
        assertTrue(a.answer().toLowerCase().contains("bonjour"));
        assertTrue(a.sources().isEmpty());
        verify(vectorSearchService, never()).search(anyString());
        verify(llmService, never()).generateAnswer(anyString(), anyList());
    }

    @Test
    @DisplayName("answer() - question vide → answered=false")
    void answer_emptyQuestion_refused() {
        RagAnswer a = ragService.answer("");
        assertFalse(a.answered());
        assertTrue(a.sources().isEmpty());
        assertNotNull(a.answer());
    }

    @Test
    @DisplayName("answer() - aucun chunk pertinent → answered=false (refus)")
    void answer_noRelevantChunks_refused() {
        when(vectorSearchService.search(anyString())).thenReturn(List.of());

        RagAnswer a = ragService.answer("question");

        assertFalse(a.answered());
        assertEquals(0.25, a.confidence(), 0.001);
        assertTrue(a.sources().isEmpty());
        assertTrue(a.answer().length() > 20);
    }

    @Test
    @DisplayName("answer() - chunks pertinents + LLM OK → answered=true")
    void answer_withChunksAndLlm_success() {
        List<SearchResultDto> chunks = passwordChunks();
        when(vectorSearchService.search("mdp")).thenReturn(chunks);
        when(confidenceCalculator.calculate(chunks)).thenReturn(0.90);
        when(confidenceCalculator.getSimilarityThreshold()).thenReturn(0.70);
        when(llmService.generateAnswer(anyString(), anyList()))
            .thenReturn("Cliquez sur mot de passe oublié et saisissez votre email.");

        RagAnswer a = ragService.answer("mdp");

        assertTrue(a.answered(), "Réponse doit être acceptée");
        assertTrue(a.confidence() >= 0.70);
        assertFalse(a.sources().isEmpty());
        assertFalse(a.answer().isBlank());
        verify(llmService, times(1)).generateAnswer(anyString(), anyList());
    }

    @Test
    @DisplayName("answer() - source attribution: sources présentes quand answered=true")
    void answer_sourcesAttribution_sourcesPresent() {
        List<SearchResultDto> chunks = passwordChunks();
        when(vectorSearchService.search(anyString())).thenReturn(chunks);
        when(confidenceCalculator.calculate(anyList())).thenReturn(0.88);
        when(confidenceCalculator.getSimilarityThreshold()).thenReturn(0.70);
        when(llmService.generateAnswer(anyString(), anyList())).thenReturn("Réponse ok.");

        RagAnswer a = ragService.answer("réinitialiser");

        assertFalse(a.sources().isEmpty(), "Des sources doivent être retournées");
        SourceDto first = a.sources().get(0);
        assertNotNull(first.documentId());
        assertNotNull(first.title());
        assertTrue(first.title().toLowerCase().contains("mot de passe")
            || first.title().toLowerCase().contains("mdp"));
    }

    @Test
    @DisplayName("answer() - LLM refuse explicitement → answered=false")
    void answer_llmRefuses_answeredFalse() {
        List<SearchResultDto> chunks = passwordChunks();
        when(vectorSearchService.search(anyString())).thenReturn(chunks);
        when(confidenceCalculator.calculate(chunks)).thenReturn(0.85);
        when(confidenceCalculator.getSimilarityThreshold()).thenReturn(0.70);
        when(llmService.generateAnswer(anyString(), anyList()))
            .thenReturn("Je n'ai pas trouvé l'information demandée dans la documentation.");

        RagAnswer a = ragService.answer("téléphone perso pdg");

        assertFalse(a.answered(), "Doit détecter le refus du LLM");
    }

    @Test
    @DisplayName("answer() - chunks + LLM jette exception → fallback déterministe")
    void answer_llmFails_fallbackFromContext() {
        List<SearchResultDto> chunks = passwordChunks();
        when(vectorSearchService.search(anyString())).thenReturn(chunks);
        when(confidenceCalculator.calculate(chunks)).thenReturn(0.88);
        when(confidenceCalculator.getSimilarityThreshold()).thenReturn(0.70);
        when(llmService.generateAnswer(anyString(), anyList()))
            .thenThrow(new RuntimeException("LLM DOWN"));

        RagAnswer a = ragService.answer("mdp oublié");

        assertTrue(a.answered(), "Même en fallback, on retourne qq chose (snippets)");
        assertFalse(a.sources().isEmpty());
        assertTrue(a.answer().toLowerCase().contains("documentation")
            || a.answer().contains("•"));
    }

    @Test
    @DisplayName("answer() - 1 chunk sous seuil → answered=false (refus par confiance trop faible)")
    void answer_1ChunkBelowThreshold_refused() {
        SearchResultDto weak = new SearchResultDto(
            UUID.randomUUID(), "Weak doc", 1, "X", "Unrelated content", 0.55
        );
        when(vectorSearchService.search(anyString())).thenReturn(List.of(weak));
        when(confidenceCalculator.calculate(anyList())).thenReturn(0.45);
        when(confidenceCalculator.getSimilarityThreshold()).thenReturn(0.70);

        RagAnswer a = ragService.answer("q");

        assertFalse(a.answered(),
            "1 seul chunk sous le seuil doit déclencher un refus");
    }

    @Test
    @DisplayName("answer() - sources dédupliquées (même doc plusieurs chunks → 1 source)")
    void answer_sourcesDeduplicated() {
        UUID sameDoc = UUID.randomUUID();
        List<SearchResultDto> chunks = List.of(
            new SearchResultDto(sameDoc, "Unique", 1, "A", "C1", 0.95),
            new SearchResultDto(sameDoc, "Unique", 2, "B", "C2", 0.90),
            new SearchResultDto(sameDoc, "Unique", 3, "C", "C3", 0.85)
        );
        when(vectorSearchService.search(anyString())).thenReturn(chunks);
        when(confidenceCalculator.calculate(chunks)).thenReturn(0.92);
        when(confidenceCalculator.getSimilarityThreshold()).thenReturn(0.70);
        when(llmService.generateAnswer(anyString(), anyList())).thenReturn("OK");

        RagAnswer a = ragService.answer("q");

        assertEquals(1, a.sources().size(),
            "3 chunks même doc → 1 seule source (dédupliquée)");
        assertEquals(sameDoc, a.sources().get(0).documentId());
    }

    private List<SearchResultDto> passwordChunks() {
        return List.of(
            new SearchResultDto(
                docPasswordGuide,
                "Guide réinitialisation mot de passe",
                1,
                "Procédure",
                "Pour réinitialiser votre mot de passe, cliquez sur 'Mot de passe oublié' puis saisissez votre email.",
                0.96
            ),
            new SearchResultDto(
                docPasswordGuide,
                "Guide réinitialisation mot de passe",
                2,
                "Validité",
                "Le lien de réinitialisation est valide 15 minutes. Vérifiez aussi le dossier spam.",
                0.89
            )
        );
    }
}
