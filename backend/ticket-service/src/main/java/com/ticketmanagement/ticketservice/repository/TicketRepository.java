package com.ticketmanagement.ticketservice.repository;

import com.ticketmanagement.ticketservice.entity.Category;
import com.ticketmanagement.ticketservice.entity.Ticket;
import com.ticketmanagement.ticketservice.entity.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface TicketRepository extends JpaRepository<Ticket, UUID> {
    List<Ticket> findAllByOrderByCreatedAtDesc();
    List<Ticket> findByAssignedAgentIdOrderByCreatedAtDesc(UUID agentId);
    List<Ticket> findByTeamIdOrderByCreatedAtDesc(UUID teamId);
    long countByAssignedAgentIdAndStatusIn(UUID assignedAgentId, Collection<TicketStatus> statuses);
    long countByAssignedAgentIdAndStatus(String assignedAgentId, TicketStatus status);

    // ---- Analytics queries ----
    @Query("SELECT COUNT(t) FROM Ticket t " +
           "WHERE t.createdAt >= :from AND t.createdAt < :to " +
           "AND (:teamId IS NULL OR t.teamId = :teamId) " +
           "AND (:assignedAgentId IS NULL OR t.assignedAgentId = :assignedAgentId)")
    long countCreatedInRange(@Param("from") LocalDateTime from,
                             @Param("to") LocalDateTime to,
                             @Param("teamId") UUID teamId,
                             @Param("assignedAgentId") UUID assignedAgentId);

    @Query("SELECT COUNT(t) FROM Ticket t " +
           "WHERE t.status IN :terminalStatuses " +
           "AND t.updatedAt >= :from AND t.updatedAt < :to " +
           "AND (:teamId IS NULL OR t.teamId = :teamId) " +
           "AND (:assignedAgentId IS NULL OR t.assignedAgentId = :assignedAgentId)")
    long countResolvedInRange(@Param("from") LocalDateTime from,
                              @Param("to") LocalDateTime to,
                              @Param("terminalStatuses") Collection<TicketStatus> terminalStatuses,
                              @Param("teamId") UUID teamId,
                              @Param("assignedAgentId") UUID assignedAgentId);

    /**
     * Count tickets grouped by Category, scoped to team / assigned agent.
     * Returns Object[] = [Category (enum), Long count].
     * Categories with 0 tickets are NOT returned; callers should post-process to add them.
     */
    @Query("SELECT t.category, COUNT(t) FROM Ticket t " +
           "WHERE (:teamId IS NULL OR t.teamId = :teamId) " +
           "AND (:assignedAgentId IS NULL OR t.assignedAgentId = :assignedAgentId) " +
           "AND t.category IS NOT NULL " +
           "GROUP BY t.category")
    List<Object[]> countByCategoryScoped(@Param("teamId") UUID teamId,
                                         @Param("assignedAgentId") UUID assignedAgentId);
}