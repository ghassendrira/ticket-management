package com.example.ragbackend.document;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<DocumentEntity, UUID> {
    long countByStatus(String status);

    List<DocumentEntity> findAllByStatusOrderByCreatedAtDesc(String status);
}
