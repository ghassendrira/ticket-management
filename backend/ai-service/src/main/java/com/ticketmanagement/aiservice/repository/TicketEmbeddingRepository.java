package com.ticketmanagement.aiservice.repository;

import com.ticketmanagement.aiservice.entity.TicketEmbedding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TicketEmbeddingRepository extends JpaRepository<TicketEmbedding, UUID> {

    @Query(value = """
        SELECT 
            te.ticket_id,
            te.resolution_summary,
            1 - (te.embedding <=> CAST(:embedding AS vector)) AS similarity
        FROM ticket_embeddings te
        JOIN tickets t ON t.id = te.ticket_id
        WHERE t.status IN ('RESOLVED', 'CLOSED')
        ORDER BY te.embedding <=> CAST(:embedding AS vector)
        LIMIT 5
        """, nativeQuery = true)
    List<Object[]> findTop5SimilarResolvedTickets(@Param("embedding") String embedding);
}