package com.example.ragbackend.ai;

import com.example.ragbackend.ai.dto.EscalationSummaryResponse;
import com.example.ragbackend.conversation.ConversationEntity;
import com.example.ragbackend.conversation.ConversationRepository;
import com.example.ragbackend.conversation.MessageEntity;
import com.example.ragbackend.conversation.MessageRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AiEscalationApi Tests (Escalation Summary)")
class AiEscalationApiTest {

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private LlmService llmService;

    private AiEscalationApi api;

    private ObjectMapper objectMapper;
    private UUID convId;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        api = new AiEscalationApi(conversationRepository, messageRepository, llmService, objectMapper);
        convId = UUID.randomUUID();
    }

    @Test
    @DisplayName("summarize-escalation: conversation vide → valeurs par défaut sûres")
    void summarize_emptyConversation_defaultValues() {
        ConversationEntity conv = mock(ConversationEntity.class);
        when(conv.getId()).thenReturn(convId);
        when(conversationRepository.findById(convId)).thenReturn(Optional.of(conv));
        when(messageRepository.findAllByConversationIdOrderByIdAsc(convId)).thenReturn(List.of());

        com.example.ragbackend.ai.dto.EscalationSummaryRequest req =
            new com.example.ragbackend.ai.dto.EscalationSummaryRequest(convId);
        EscalationSummaryResponse r = api.summarizeEscalation(req);

        assertNotNull(r);
        assertEquals("OTHER", r.predictedCategory());
        assertEquals("LOW", r.predictedPriority());
        assertEquals("NEUTRAL", r.sentiment());
        assertTrue(r.attemptedSolutions().isEmpty());
    }

    @Test
    @DisplayName("summarize-escalation: LLM retourne JSON valide → champs parsés correctement")
    void summarize_llmReturnsValidJson_parsedCorrectly() throws Exception {
        ConversationEntity conv = mock(ConversationEntity.class);
        when(conv.getId()).thenReturn(convId);
        when(conversationRepository.findById(convId)).thenReturn(Optional.of(conv));

        MessageEntity user = mock(MessageEntity.class);
        when(user.getRole()).thenReturn("USER");
        when(user.getContent()).thenReturn("J'ai oublié mon mot de passe !");

        MessageEntity assistant = mock(MessageEntity.class);
        when(assistant.getRole()).thenReturn("ASSISTANT");
        when(assistant.getContent()).thenReturn("Vérifiez vos spams.");

        when(messageRepository.findAllByConversationIdOrderByIdAsc(convId))
            .thenReturn(List.of(user, assistant));

        String validJson = """
        {
          "title": "Réinitialisation MDP",
          "summary": "Le client a oublié son mot de passe. L'assistant propose de vérifier les spams.",
          "predictedCategory": "ACCOUNT",
          "predictedPriority": "MEDIUM",
          "sentiment": "NEGATIVE",
          "attemptedSolutions": ["Vérifier spams"]
        }
        """;
        when(llmService.generate(anyString(), anyString())).thenReturn(validJson);

        com.example.ragbackend.ai.dto.EscalationSummaryRequest req =
            new com.example.ragbackend.ai.dto.EscalationSummaryRequest(convId);
        EscalationSummaryResponse r = api.summarizeEscalation(req);

        assertEquals("Réinitialisation MDP", r.title());
        assertEquals("ACCOUNT", r.predictedCategory());
        assertEquals("MEDIUM", r.predictedPriority());
        assertEquals("NEGATIVE", r.sentiment());
        assertEquals(1, r.attemptedSolutions().size());
        assertTrue(r.attemptedSolutions().get(0).toLowerCase().contains("spam"));
    }

    @Test
    @DisplayName("summarize-escalation: catégories/priorités invalides → normalisées (fallback)")
    void summarize_invalidEnumValues_normalized() {
        ConversationEntity conv = mock(ConversationEntity.class);
        when(conv.getId()).thenReturn(convId);
        when(conversationRepository.findById(convId)).thenReturn(Optional.of(conv));
        MessageEntity m = mock(MessageEntity.class);
        when(m.getRole()).thenReturn("USER");
        when(m.getContent()).thenReturn("test");
        when(messageRepository.findAllByConversationIdOrderByIdAsc(convId)).thenReturn(List.of(m));

        String invalidJson = """
        {
          "title": "T",
          "summary": "S",
          "predictedCategory": "BIDON_CATEGORY",
          "predictedPriority": "BIDON_PRIORITY",
          "sentiment": "BIDON_SENTIMENT",
          "attemptedSolutions": []
        }
        """;
        when(llmService.generate(anyString(), anyString())).thenReturn(invalidJson);

        EscalationSummaryResponse r = api.summarizeEscalation(
            new com.example.ragbackend.ai.dto.EscalationSummaryRequest(convId));

        assertEquals("OTHER", r.predictedCategory());
        assertEquals("LOW", r.predictedPriority());
        assertEquals("NEUTRAL", r.sentiment());
    }

    @Test
    @DisplayName("summarize-escalation: LLM indisponible → fallback déterministe (pas d'erreur)")
    void summarize_llmFails_fallback() {
        ConversationEntity conv = mock(ConversationEntity.class);
        when(conv.getId()).thenReturn(convId);
        when(conversationRepository.findById(convId)).thenReturn(Optional.of(conv));

        MessageEntity m1 = mock(MessageEntity.class);
        when(m1.getRole()).thenReturn("USER");
        when(m1.getContent()).thenReturn("Mon compte est bloqué depuis hier. Je veux une solution !");

        MessageEntity m2 = mock(MessageEntity.class);
        when(m2.getRole()).thenReturn("ASSISTANT");
        when(m2.getContent()).thenReturn("Voyons ça ensemble.");

        when(messageRepository.findAllByConversationIdOrderByIdAsc(convId))
            .thenReturn(List.of(m1, m2));
        when(llmService.generate(anyString(), anyString()))
            .thenThrow(new RuntimeException("LLM DOWN"));

        EscalationSummaryResponse r = api.summarizeEscalation(
            new com.example.ragbackend.ai.dto.EscalationSummaryRequest(convId));

        assertNotNull(r);
        assertNotNull(r.title());
        assertNotNull(r.summary());
        assertFalse(r.summary().isBlank());
        assertNotNull(r.predictedCategory());
        assertNotNull(r.predictedPriority());
        assertNotNull(r.sentiment());
        assertNotNull(r.attemptedSolutions());
        assertTrue(r.summary().toLowerCase().contains("bloqué")
            || r.summary().toLowerCase().contains("message"));
    }

    @Test
    @DisplayName("summarize-escalation: JSON LLM malformé → fallback")
    void summarize_malformedJson_fallback() {
        ConversationEntity conv = mock(ConversationEntity.class);
        when(conv.getId()).thenReturn(convId);
        when(conversationRepository.findById(convId)).thenReturn(Optional.of(conv));
        MessageEntity m = mock(MessageEntity.class);
        when(m.getRole()).thenReturn("USER");
        when(m.getContent()).thenReturn("contenu user");
        when(messageRepository.findAllByConversationIdOrderByIdAsc(convId)).thenReturn(List.of(m));
        when(llmService.generate(anyString(), anyString())).thenReturn("PAS DU JSON DU TOUT {{{");

        EscalationSummaryResponse r = api.summarizeEscalation(
            new com.example.ragbackend.ai.dto.EscalationSummaryRequest(convId));

        assertNotNull(r);
        assertNotNull(r.title());
        assertFalse(r.summary().isBlank());
    }

    @Test
    @DisplayName("summarize-escalation: LLM JSON dans texte + backticks extrait correctement")
    void summarize_jsonExtractedFromSurroundingText() {
        ConversationEntity conv = mock(ConversationEntity.class);
        when(conv.getId()).thenReturn(convId);
        when(conversationRepository.findById(convId)).thenReturn(Optional.of(conv));
        MessageEntity m = mock(MessageEntity.class);
        when(m.getRole()).thenReturn("USER");
        when(m.getContent()).thenReturn("contenu");
        when(messageRepository.findAllByConversationIdOrderByIdAsc(convId)).thenReturn(List.of(m));

        String surrounded = "Voici ma réponse :\n```json\n"
            + "{\"title\":\"OK\",\"summary\":\"Sommaire\",\"predictedCategory\":\"PRODUCT_INFO\","
            + "\"predictedPriority\":\"HIGH\",\"sentiment\":\"POSITIVE\",\"attemptedSolutions\":[\"S1\"]}\n"
            + "```\nFin.";
        when(llmService.generate(anyString(), anyString())).thenReturn(surrounded);

        EscalationSummaryResponse r = api.summarizeEscalation(
            new com.example.ragbackend.ai.dto.EscalationSummaryRequest(convId));

        assertEquals("PRODUCT_INFO", r.predictedCategory());
        assertEquals("HIGH", r.predictedPriority());
        assertEquals("POSITIVE", r.sentiment());
        assertEquals(1, r.attemptedSolutions().size());
    }
}
