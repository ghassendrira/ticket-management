package com.ticketmanagement.ticketservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tickets", indexes = {
    @Index(name = "idx_tickets_created_at", columnList = "created_at"),
    @Index(name = "idx_tickets_updated_at", columnList = "updated_at"),
    @Index(name = "idx_tickets_status", columnList = "status"),
    @Index(name = "idx_tickets_priority", columnList = "priority"),
    @Index(name = "idx_tickets_category", columnList = "category"),
    @Index(name = "idx_tickets_assigned_agent", columnList = "assigned_agent_id"),
    @Index(name = "idx_tickets_team", columnList = "team_id")
})
@Getter
@Setter
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TicketStatus status = TicketStatus.NEW;

    @Enumerated(EnumType.STRING)
    private Priority priority;

    @Enumerated(EnumType.STRING)
    private Category category;

    @Column(name = "customer_id")
    private String customerId;

    @Column(name = "request_id")
    private String requestId;

    @Column(name = "conversation_id")
    private String conversationId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "assigned_agent_id")
    private UUID assignedAgentId;

    @Column(name = "team_id")
    private UUID teamId;

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}