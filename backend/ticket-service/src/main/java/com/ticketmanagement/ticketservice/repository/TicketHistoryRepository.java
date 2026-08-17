package com.ticketmanagement.ticketservice.repository;

import com.ticketmanagement.ticketservice.entity.TicketHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface TicketHistoryRepository extends JpaRepository<TicketHistory, UUID> {
    List<TicketHistory> findByTicketIdOrderByChangedAtDesc(UUID ticketId);
       List<TicketHistory> findByActorIdOrderByChangedAtDesc(UUID actorId);
       List<TicketHistory> findByChangedByIdOrderByChangedAtDesc(UUID changedById);

    @Query("SELECT h FROM TicketHistory h JOIN FETCH h.ticket t " +
           "WHERE t.teamId = :teamId AND h.changedAt >= :since " +
           "ORDER BY h.changedAt DESC")
    List<TicketHistory> findTeamActivitySince(@Param("teamId") UUID teamId,
                                               @Param("since") LocalDateTime since);

    @Query("SELECT h FROM TicketHistory h JOIN FETCH h.ticket t " +
           "WHERE t.teamId = :teamId " +
           "ORDER BY h.changedAt DESC " +
           "LIMIT 50")
    List<TicketHistory> findRecentTeamActivity(@Param("teamId") UUID teamId);
}