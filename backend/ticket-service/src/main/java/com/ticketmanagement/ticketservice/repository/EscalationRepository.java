package com.ticketmanagement.ticketservice.repository;

import com.ticketmanagement.ticketservice.entity.Escalation;
import com.ticketmanagement.ticketservice.entity.EscalationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EscalationRepository extends JpaRepository<Escalation, UUID> {
    Optional<Escalation> findFirstByTicketIdAndStatus(UUID ticketId, EscalationStatus status);
    Optional<Escalation> findFirstByTicketIdOrderByCreatedAtDesc(UUID ticketId);
    List<Escalation> findByManagerIdAndTeamId(UUID managerId, UUID teamId);
    List<Escalation> findByManagerId(UUID managerId);
    List<Escalation> findByManagerIdAndStatus(UUID managerId, EscalationStatus status);
    List<Escalation> findByRequestedByAgentId(UUID agentId);
    List<Escalation> findByRequestedByAgentIdAndStatus(UUID agentId, EscalationStatus status);
    List<Escalation> findByTeamId(UUID teamId);
    List<Escalation> findByTeamIdAndStatus(UUID teamId, EscalationStatus status);
    List<Escalation> findByCreatedAtAfter(LocalDateTime after);
    List<Escalation> findByStatusIn(List<EscalationStatus> statuses);
}
