package com.example.ragbackend.ai;

import com.example.ragbackend.exception.EmbeddingGenerationException;
import com.example.ragbackend.exception.OllamaUnavailableException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("EmbeddingService Tests")
class EmbeddingServiceTest {

    @Mock
    private RestTemplate restTemplate;

    private EmbeddingService service;

    private static final int EXPECTED_DIM = 768;

    @BeforeEach
    void setUp() {
        service = new EmbeddingService(restTemplate, "http://localhost:11434", "nomic-embed-text");
    }

    @Test
    @DisplayName("Dimension attendue = 768")
    void getExpectedDimension_is768() {
        assertEquals(768, service.getExpectedDimension());
    }

    @Test
    @DisplayName("embed() - texte vide lance IllegalArgumentException")
    void embed_emptyText_throws() {
        assertThrows(IllegalArgumentException.class, () -> service.embed(""));
        assertThrows(IllegalArgumentException.class, () -> service.embed(null));
        assertThrows(IllegalArgumentException.class, () -> service.embed("   \n  "));
    }

    @Test
    @DisplayName("embed() - réponse OK retourne vecteur dimension 768")
    void embed_validResponse_returnsDimension768() {
        float[] embedding = buildMockEmbedding(EXPECTED_DIM);
        Map<String, Object> mockResponse = Map.of(
            "embeddings", List.of(toObjectList(embedding))
        );
        when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(Map.class)))
            .thenReturn(mockResponse);

        float[] result = service.embed("Bonjour le monde");

        assertNotNull(result);
        assertEquals(EXPECTED_DIM, result.length, "La dimension doit être exactement 768");
        for (float v : result) {
            assertTrue(Float.isFinite(v), "Chaque composante doit être un nombre fini");
        }
    }

    @Test
    @DisplayName("embed() - dimension incorrecte lance EmbeddingGenerationException")
    void embed_wrongDimension_throwsEmbeddingException() {
        float[] bad = buildMockEmbedding(384);
        Map<String, Object> mockResponse = Map.of(
            "embeddings", List.of(toObjectList(bad))
        );
        when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(Map.class)))
            .thenReturn(mockResponse);

        EmbeddingGenerationException ex = assertThrows(EmbeddingGenerationException.class,
            () -> service.embed("test"));
        assertTrue(ex.getMessage().contains("768"));
        assertTrue(ex.getMessage().contains("384"));
        assertEquals("EMBEDDING_GENERATION_FAILED", ex.getErrorCode());
    }

    @Test
    @DisplayName("embed() - Ollama indisponible lance OllamaUnavailableException")
    void embed_ollamaUnreachable_throwsOllamaUnavailable() {
        when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(Map.class)))
            .thenThrow(new ResourceAccessException("Connection refused"));

        OllamaUnavailableException ex = assertThrows(OllamaUnavailableException.class,
            () -> service.embed("test"));
        assertEquals("OLLAMA_UNAVAILABLE", ex.getErrorCode());
        assertTrue(ex.getMessage().contains("11434"));
    }

    @Test
    @DisplayName("embedBatch() - lot de 3 textes retourne 3 vecteurs")
    void embedBatch_multipleTexts_returnsMultipleVectors() {
        float[] e1 = buildMockEmbedding(EXPECTED_DIM);
        float[] e2 = buildMockEmbedding(EXPECTED_DIM);
        float[] e3 = buildMockEmbedding(EXPECTED_DIM);
        Map<String, Object> mockResponse = Map.of(
            "embeddings", List.of(toObjectList(e1), toObjectList(e2), toObjectList(e3))
        );
        when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(Map.class)))
            .thenReturn(mockResponse);

        List<float[]> result = service.embedBatch(List.of("A", "B", "C"));

        assertEquals(3, result.size());
        for (float[] f : result) {
            assertEquals(EXPECTED_DIM, f.length);
        }
    }

    @Test
    @DisplayName("embedBatch() - liste vide retourne liste vide")
    void embedBatch_emptyList_returnsEmpty() {
        List<float[]> result = service.embedBatch(List.of());
        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    private float[] buildMockEmbedding(int dim) {
        float[] v = new float[dim];
        for (int i = 0; i < dim; i++) {
            v[i] = (float) Math.random() * 2 - 1;
        }
        return v;
    }

    private List<Double> toObjectList(float[] vec) {
        java.util.ArrayList<Double> list = new java.util.ArrayList<>(vec.length);
        for (float v : vec) {
            list.add((double) v);
        }
        return list;
    }
}
