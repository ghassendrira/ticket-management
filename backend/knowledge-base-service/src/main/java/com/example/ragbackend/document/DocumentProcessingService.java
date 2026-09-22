package com.example.ragbackend.document;

import com.example.ragbackend.ai.EmbeddingService;
import com.example.ragbackend.document.chunk.TextChunker;
import com.example.ragbackend.document.extract.DocumentExtractorFactory;
import com.example.ragbackend.document.extract.ExtractedDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class DocumentProcessingService {

    private static final Logger LOGGER = LoggerFactory.getLogger(DocumentProcessingService.class);

    private final DocumentRepository documentRepository;
    private final ChunkRepository chunkRepository;
    private final DocumentExtractorFactory extractorFactory;
    private final TextChunker textChunker;
    private final EmbeddingService embeddingService;

    // ✅ SELF-INJECTION avec @Lazy pour éviter la circular reference
    @Autowired
    @Lazy
    private DocumentProcessingService self;

    public DocumentProcessingService(
        DocumentRepository documentRepository,
        ChunkRepository chunkRepository,
        DocumentExtractorFactory extractorFactory,
        TextChunker textChunker,
        EmbeddingService embeddingService
    ) {
        this.documentRepository = documentRepository;
        this.chunkRepository = chunkRepository;
        this.extractorFactory = extractorFactory;
        this.textChunker = textChunker;
        this.embeddingService = embeddingService;
    }

    @Async
    public void processDocument(UUID documentId) {
        DocumentEntity document = documentRepository.findById(documentId).orElse(null);
        if (document == null) {
            LOGGER.error("Document {} introuvable pour le traitement asynchrone", documentId);
            return;
        }

        try {
            updateStatus(document, "PROCESSING");
            LOGGER.info("[DOC #{}] Début traitement - statut PROCESSING", documentId);

            Path filePath = Paths.get(document.getFilePath());
            if (!Files.exists(filePath)) {
                throw new IllegalStateException(
                    "Fichier introuvable sur le disque: " + document.getFilePath()
                );
            }

            LOGGER.info("[DOC #{}] 1/4 Extraction de texte...", documentId);
            ExtractedDocument extracted = extractorFactory.extract(filePath);
            List<ExtractedDocument.DocumentFragment> fragments = extracted.getNonEmptyFragments();
            if (fragments.isEmpty()) {
                throw new IllegalStateException("Le document est vide ou ne contient aucun texte extractible");
            }
            int totalChars = fragments.stream()
                .mapToInt(f -> f.content() != null ? f.content().length() : 0)
                .sum();
            LOGGER.info("[DOC #{}]   Extraction OK: {} fragments, {} caractères",
                documentId, fragments.size(), totalChars);

            LOGGER.info("[DOC #{}] 2/4 Découpage en chunks...", documentId);
            List<TextChunker.Chunk> chunks = textChunker.chunk(extracted);
            if (chunks.isEmpty()) {
                throw new IllegalStateException("Aucun chunk n'a pu être généré à partir du document");
            }
            LOGGER.info("[DOC #{}]   Chunking OK: {} chunks générés", documentId, chunks.size());

            LOGGER.info("[DOC #{}] 3/4 Génération des embeddings (modèle={}, dim={})...",
                documentId, embeddingService.getModelName(), embeddingService.getExpectedDimension());
            List<String> chunkContents = chunks.stream()
                .map(TextChunker.Chunk::content)
                .toList();
            List<float[]> embeddings = embeddingService.embedBatch(chunkContents);
            if (embeddings.size() != chunks.size()) {
                throw new IllegalStateException(
                    "Embedding mismatch: " + chunks.size() + " chunks vs " + embeddings.size() + " embeddings"
                );
            }
            LOGGER.info("[DOC #{}]   Embeddings OK", documentId);

            LOGGER.info("[DOC #{}] 4/4 Sauvegarde en base...", documentId);
            // ✅ Appel via self pour que le proxy Spring gère la transaction
            self.saveChunksInTransaction(documentId, document, chunks, embeddings);
            updateStatus(document, "INDEXED");
            LOGGER.info("[DOC #{}] Traitement TERMINÉ avec succès - statut INDEXED ({} chunks)",
                documentId, chunks.size());

        } catch (Exception ex) {
            LOGGER.error("===== ERREUR TRAITEMENT DOCUMENT #{} =====", documentId);
            LOGGER.error("Type exception: {}", ex.getClass().getSimpleName());
            LOGGER.error("Message: {}", ex.getMessage());
            if (ex.getCause() != null) {
                LOGGER.error("Cause: {} - {}", ex.getCause().getClass().getSimpleName(), ex.getCause().getMessage());
            }
            LOGGER.error("==========================================", ex);

            DocumentEntity doc = documentRepository.findById(documentId).orElse(null);
            if (doc != null) {
                doc.setStatus("FAILED");
                documentRepository.save(doc);
                LOGGER.info("[DOC #{}] Statut passé à FAILED", documentId);
            }
        }
    }

    @Transactional
    public void saveChunksInTransaction(
        UUID documentId,
        DocumentEntity document,
        List<TextChunker.Chunk> chunks,
        List<float[]> embeddings
    ) {
        chunkRepository.deleteByDocumentId(documentId);
        chunkRepository.flush();

        LocalDateTime now = LocalDateTime.now();
        String modelName = embeddingService.getModelName();

        for (int i = 0; i < chunks.size(); i++) {
            TextChunker.Chunk c = chunks.get(i);
            ChunkEntity entity = new ChunkEntity();
            entity.setDocument(document);
            entity.setContent(c.content());
            entity.setPageNumber(c.pageNumber());
            entity.setChunkOrder(c.chunkOrder());
            entity.setSection(c.section());
            entity.setEmbedding(embeddings.get(i));
            entity.setEmbeddingModel(modelName);
            entity.setIndexedAt(now);
            entity.setCreatedAt(now);
            chunkRepository.save(entity);
        }
        chunkRepository.flush();
        LOGGER.info("{} chunks persistés pour document #{}", chunks.size(), documentId);
    }

    private void updateStatus(DocumentEntity document, String status) {
        document.setStatus(status);
        documentRepository.save(document);
    }
}