package com.example.ragbackend.document;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ChunkRepository extends JpaRepository<ChunkEntity, UUID> {

    void deleteAllByDocument_Id(UUID documentId);

    @Query(value = """
        SELECT 
            c.id,
            c.document_id,
            c.content,
            c.page_number,
            c.chunk_order,
            c.section,
            (1 - (c.embedding <=> CAST(:embedding AS vector(768)))) AS similarity
        FROM document_chunks c
        WHERE (1 - (c.embedding <=> CAST(:embedding AS vector(768)))) >= :threshold
        ORDER BY similarity DESC
        LIMIT :topK
        """, nativeQuery = true)
    List<Object[]> findSimilarChunks(
        @Param("embedding") float[] embedding,
        @Param("threshold") double threshold,
        @Param("topK") int topK
    );

    @Modifying
    @Query("DELETE FROM ChunkEntity c WHERE c.document.id = :documentId")
    void deleteByDocumentId(@Param("documentId") UUID documentId);
}
