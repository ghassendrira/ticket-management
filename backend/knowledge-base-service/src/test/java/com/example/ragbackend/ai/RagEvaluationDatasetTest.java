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

@DisplayName("RAG Evaluation Dataset Tests")
@ExtendWith(MockitoExtension.class)
class RagEvaluationDatasetTest {

    @Mock
    private VectorSearchService vectorSearchService;

    @Mock
    private ConfidenceCalculator confidenceCalculator;

    @Mock
    private LlmService llmService;

    private RagService ragService;

    private UUID passwordDocId;

    @BeforeEach
    void setUp() {
        ragService = new RagService(vectorSearchService, confidenceCalculator, llmService);
        passwordDocId = UUID.randomUUID();
    }

    @Test
    @DisplayName("EVAL-001: Q='Comment réinitialiser mon mot de passe?' → answered=true + bonne section")
    void eval001_passwordResetQuestion_answeredTrueWithCorrectSection() {
        List<SearchResultDto> passwordChunks = List.of(
            new SearchResultDto(
                passwordDocId,
                "guide-reinitialisation-mot-de-passe",
                1,
                "Procédure de réinitialisation",
                "Pour réinitialiser votre mot de passe, cliquez sur 'Mot de passe oublié' sur la page de connexion, puis saisissez votre adresse email. Un lien de réinitialisation vous sera envoyé.",
                0.96
            ),
            new SearchResultDto(
                passwordDocId,
                "guide-reinitialisation-mot-de-passe",
                2,
                "Réception et validité du lien",
                "Le lien de réinitialisation est valide 15 minutes. Vérifiez aussi le dossier spam.",
                0.88
            )
        );

        when(vectorSearchService.search(argThat(q -> q != null && (
            q.toLowerCase().contains("réinitialiser")
                || q.toLowerCase().contains("password")
                || q.toLowerCase().contains("mot de passe")
        )))).thenReturn(passwordChunks);

        when(confidenceCalculator.calculate(passwordChunks)).thenReturn(0.91);
        when(confidenceCalculator.getSimilarityThreshold()).thenReturn(0.70);
        when(llmService.generateAnswer(anyString(), anyList()))
            .thenReturn("Pour réinitialiser votre mot de passe, cliquez sur 'Mot de passe oublié' sur la page de connexion, puis saisissez votre adresse email. Un lien valide 15 minutes vous sera envoyé.");

        String question = "Comment réinitialiser mon mot de passe ?";
        RagAnswer a = ragService.answer(question);

        assertTrue(a.answered(),
            "EVAL-001 attendu answered=true, obtenu false (question: " + question + ")");

        List<SourceDto> sources = a.sources();
        assertFalse(sources.isEmpty(), "Des sources doivent être présentes");

        boolean sourceTrouvee = sources.stream()
            .anyMatch(s -> {
                if (s.title() == null) return false;
                String t = s.title().toLowerCase();
                return t.contains("guide-reinitialisation-mot-de-passe")
                    || t.contains("mot de passe")
                    || t.contains("reinitialisation");
            });
        assertTrue(sourceTrouvee, "La source doit référencer le guide MDP");

        assertTrue(a.confidence() >= 0.70,
            "La confiance doit être suffisante, obtenu: " + a.confidence());
    }

    @Test
    @DisplayName("EVAL-002: Q='Numéro personnel du PDG?' → answered=false (info absente)")
    void eval002_ceoPhonePersonal_answeredFalse() {
        UUID unrelatedDoc = UUID.randomUUID();
        List<SearchResultDto> badChunks = List.of(
            new SearchResultDto(unrelatedDoc, "Mentions légales", 3, null,
                "Le siège social est ouvert de 9h à 18h.", 0.51)
        );

        when(vectorSearchService.search(argThat(q -> q != null && (
            q.toLowerCase().contains("ceo")
                || q.toLowerCase().contains("pdg")
                || q.toLowerCase().contains("phone")
                || q.toLowerCase().contains("téléphone")
        )))).thenReturn(List.of());

        String questionFr = "Quel est le numéro de téléphone personnel du PDG ?";
        RagAnswer aFr = ragService.answer(questionFr);
        assertFalse(aFr.answered(),
            "EVAL-002 (FR) attendu answered=false pour info absente, obtenu true");
        assertEquals(0.25, aFr.confidence(), 0.001,
            "La confiance sur refus doit être basse (0.25)");
        assertTrue(aFr.sources().isEmpty(),
            "Aucune source pour une info absente");
        assertNotNull(aFr.answer());
        assertFalse(aFr.answer().isBlank());

        reset(vectorSearchService);

        String questionEn = "What is the CEO's personal phone number?";
        when(vectorSearchService.search(anyString())).thenReturn(List.of());
        RagAnswer aEn = ragService.answer(questionEn);
        assertFalse(aEn.answered(),
            "EVAL-002 (EN) attendu answered=false, obtenu true");
    }

    @Test
    @DisplayName("EVAL-BONUS: answered=false, les keywords d'info absente apparaissent")
    void eval002_refusalMessageContainsStandardPattern() {
        when(vectorSearchService.search(anyString())).thenReturn(List.of());
        RagAnswer a = ragService.answer("info absente");

        String ans = a.answer().toLowerCase();
        boolean ok = ans.contains("pas trouvé")
            || ans.contains("documentation")
            || ans.contains("support")
            || ans.contains("agent humain");
        assertTrue(ok, "Le message de refus doit mentionner l'absence ou le support");
    }
}
