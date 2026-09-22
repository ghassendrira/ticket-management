package com.ticketmanagement.aiservice.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ticket_embeddings")
public class TicketEmbedding {

    @Id
    @Column(name = "ticket_id", nullable = false, updatable = false)
    private UUID ticketId;

    @Column(name = "resolution_summary", length = 2000)
    private String resolutionSummary;

    @Column(name = "status", length = 50)
    private String status;   // NEW FIELD

    @Lob
    @Column(name = "embedding", nullable = false, columnDefinition = "bytea")
    private byte[] embeddingBytes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // --- Getters & Setters ---

    public UUID getTicketId() { return ticketId; }
    public void setTicketId(UUID ticketId) { this.ticketId = ticketId; }

    public String getResolutionSummary() { return resolutionSummary; }
    public void setResolutionSummary(String resolutionSummary) { this.resolutionSummary = resolutionSummary; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public byte[] getEmbeddingBytes() { return embeddingBytes; }
    public void setEmbeddingBytes(byte[] embeddingBytes) { this.embeddingBytes = embeddingBytes; }

    public float[] getEmbedding() {
        if (embeddingBytes == null) return null;
        java.nio.ByteBuffer buffer = java.nio.ByteBuffer.wrap(embeddingBytes);
        float[] result = new float[embeddingBytes.length / 4];
        for (int i = 0; i < result.length; i++) {
            result[i] = buffer.getFloat();
        }
        return result;
    }
    public void setEmbedding(float[] embedding) {
        if (embedding == null) {
            this.embeddingBytes = null;
            return;
        }
        java.nio.ByteBuffer buffer = java.nio.ByteBuffer.allocate(embedding.length * 4);
        for (float v : embedding) {
            buffer.putFloat(v);
        }
        this.embeddingBytes = buffer.array();
    }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}