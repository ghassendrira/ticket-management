package com.example.ragbackend.ai;

import com.example.ragbackend.ai.dto.SearchResultDto;
import com.example.ragbackend.document.ChunkRepository;
import com.example.ragbackend.document.DocumentEntity;
import com.example.ragbackend.document.DocumentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("VectorSearchService Tests")
class VectorSearchServiceTest {

    @Mock
    private ChunkRepository chunkRepository;

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private EmbeddingService embeddingService;

    private VectorSearchService service;

    private static final int TOP_K = 5;
    private static final double THRESHOLD = 0.70;

    private UUID docId1;
    private UUID docId2;

    @BeforeEach
    void setUp() {
        service = new VectorSearchService(
            chunkRepository, documentRepository, embeddingService, TOP_K, THRESHOLD
        );
        docId1 = UUID.randomUUID();
        docId2 = UUID.randomUUID();
    }

    @Test
    @DisplayName("search() - question vide retourne liste vide")
    void search_emptyQuestion_returnsEmpty() {
        List<SearchResultDto> r = service.search("");
        assertTrue(r.isEmpty());
        r = service.search(null);
        assertTrue(r.isEmpty());
        r = service.search("  \n  ");
        assertTrue(r.isEmpty());
    }

    @Test
    @DisplayName("search() - requête OK transmet bien embedding + seuil + topK")
    void search_validQuery_passesCorrectParameters() {
        UUID chunkId1 = UUID.randomUUID();
        UUID chunkId2 = UUID.randomUUID();
        float[] mockEmbedding = new float[768];
        when(embeddingService.embed(anyString())).thenReturn(mockEmbedding);

        List<Object[]> rawResults = List.of(
            new Object[]{chunkId1, docId1, "Contenu 1", 2, 0, "Section X", 0.95},
            new Object[]{chunkId2, docId2, "Contenu 2", 5, 1, "Section Y", 0.88}
        );
        when(chunkRepository.findSimilarChunks(eq(mockEmbedding), eq(THRESHOLD), eq(TOP_K)))
            .thenReturn(rawResults);

        DocumentEntity d1 = mockDocument(docId1, "Document Alpha");
        DocumentEntity d2 = mockDocument(docId2, "Document Beta");
        when(documentRepository.findAllById(anySet())).thenReturn(List.of(d1, d2));

        List<SearchResultDto> results = service.search("Question test");

        assertEquals(2, results.size());
        assertEquals("Document Alpha", results.get(0).documentTitle());
        assertEquals(Integer.valueOf(2), results.get(0).page());
        assertEquals("Section X", results.get(0).section());
        assertEquals(0.95, results.get(0).similarity());
        verify(embeddingService, times(1)).embed("Question test");
    }

    @Test
    @DisplayName("search() - similarité respecte l'ordre décroissant (cosine)")
    void search_resultsSortedBySimilarityDescending() {
        UUID c1 = UUID.randomUUID();
        UUID c2 = UUID.randomUUID();
        UUID c3 = UUID.randomUUID();
        float[] mockEmbedding = new float[768];
        when(embeddingService.embed(anyString())).thenReturn(mockEmbedding);

        List<Object[]> rawResults = List.of(
            new Object[]{c1, docId1, "Best", 1, 0, "A", 0.98},
            new Object[]{c2, docId1, "Middle", 1, 1, "B", 0.90},
            new Object[]{c3, docId2, "Worst", 1, 2, "C", 0.82}
        );
        when(chunkRepository.findSimilarChunks(any(float[].class), anyDouble(), anyInt()))
            .thenReturn(rawResults);

        DocumentEntity d1 = mockDocument(docId1, "D1");
        DocumentEntity d2 = mockDocument(docId2, "D2");
        when(documentRepository.findAllById(anySet())).thenReturn(List.of(d1, d2));

        List<SearchResultDto> results = service.search("test");

        assertEquals(3, results.size());
        assertTrue(results.get(0).similarity() >= results.get(1).similarity());
        assertTrue(results.get(1).similarity() >= results.get(2).similarity());
    }

    @Test
    @DisplayName("search() - filtrage par seuil: aucun chunk au-dessus retourne liste vide")
    void search_aboveThresholdEmpty_returnsEmpty() {
        float[] mockEmbedding = new float[768];
        when(embeddingService.embed(anyString())).thenReturn(mockEmbedding);
        when(chunkRepository.findSimilarChunks(any(float[].class), anyDouble(), anyInt()))
            .thenReturn(List.of());

        List<SearchResultDto> results = service.search("test");

        assertTrue(results.isEmpty());
    }

    @Test
    @DisplayName("search() - seuil et topK personnalisés")
    void search_customThresholdAndTopK() {
        UUID cid = UUID.randomUUID();
        float[] mockEmbedding = new float[768];
        when(embeddingService.embed("test")).thenReturn(mockEmbedding);

        List<Object[]> raw = List.<Object[]>of(new Object[]{cid, docId1, "C", 1, 0, null, 0.92});
        when(chunkRepository.findSimilarChunks(eq(mockEmbedding), eq(0.50), eq(3)))
            .thenReturn(raw);
        DocumentEntity d = mockDocument(docId1, "Doc");
        when(documentRepository.findAllById(anySet())).thenReturn(List.of(d));

        List<SearchResultDto> r = service.search("test", 3, 0.50);

        assertEquals(1, r.size());
        verify(chunkRepository).findSimilarChunks(mockEmbedding, 0.50, 3);
    }

    @Test
    @DisplayName("search() - champs documentId toujours présents")
    void search_documentIdPresent() {
        UUID cid = UUID.randomUUID();
        float[] mockEmbedding = new float[768];
        when(embeddingService.embed(anyString())).thenReturn(mockEmbedding);
        List<Object[]> raw = List.<Object[]>of(new Object[]{cid, docId1, "Contenu", 1, 0, "S", 0.80});
        when(chunkRepository.findSimilarChunks(any(float[].class), anyDouble(), anyInt()))
            .thenReturn(raw);
        DocumentEntity d = mockDocument(docId1, "Titre");
        when(documentRepository.findAllById(anySet())).thenReturn(List.of(d));

        SearchResultDto dto = service.search("q").get(0);

        assertNotNull(dto.documentId());
        assertEquals(docId1, dto.documentId());
        assertNotNull(dto.documentTitle());
        assertFalse(dto.content().isBlank());
    }

    private DocumentEntity mockDocument(UUID id, String title) {
        DocumentEntity d = mock(DocumentEntity.class);
        when(d.getId()).thenReturn(id);
        when(d.getTitle()).thenReturn(title);
        return d;
    }
}
