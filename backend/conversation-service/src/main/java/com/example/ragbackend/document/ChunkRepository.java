package com.example.ragbackend.document;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChunkRepository extends JpaRepository<ChunkEntity, UUID> {
    List<ChunkEntity> findAllByDocumentIdOrderByPageNumber(UUID documentId);
}
