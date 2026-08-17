package com.ticketmanagement.ticketservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "escalation")
@Getter
@Setter
public class Escalation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "ticket_id", nullable = false)
    private UUID ticketId;

    @Column(name = "requested_by_agent_id", nullable = false)
    private UUID requestedByAgentId;

    @Column(name = "manager_id", nullable = false)
    private UUID managerId;

    @Column(name = "team_id", nullable = false)
    private UUID teamId;

    @Column(name = "reason", nullable = false, length = 2000)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private EscalationStatus status = EscalationStatus.PENDING;

    @Column(name = "manager_response_reason", length = 2000)
    private String managerResponseReason;

    @Column(name = "reassigned_to_agent_id")
    private UUID reassignedToAgentId;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();
}
