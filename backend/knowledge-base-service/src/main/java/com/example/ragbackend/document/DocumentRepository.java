package com.example.ragbackend.document;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<DocumentEntity, UUID> {

    List<DocumentEntity> findAllByStatusNotOrderByCreatedAtDesc(String status);

    List<DocumentEntity> findAllByCategoryIdAndStatusNotOrderByCreatedAtDesc(UUID categoryId, String status);

    List<DocumentEntity> findAllByStatusOrderByCreatedAtDesc(String status);

    List<DocumentEntity> findAllByCategoryIdAndStatusOrderByCreatedAtDesc(UUID categoryId, String status);

    long countByCategoryIdAndStatusNot(UUID categoryId, String status);

    long countByStatus(String status);
}
