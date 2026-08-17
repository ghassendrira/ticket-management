package com.ticketmanagement.ticketservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ticket_history")
@Getter
@Setter
public class TicketHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @Enumerated(EnumType.STRING)
    @Column(name = "old_status")
    private TicketStatus oldStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false)
    private TicketStatus newStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false)
    private TicketHistoryEventType eventType = TicketHistoryEventType.STATUS_CHANGED;

    @Column(name = "message", length = 2000)
    private String message;

    @Column(name = "reason", length = 2000)
    private String reason;

    @Column(name = "actor_id")
    private UUID actorId;

    @Column(name = "actor_name")
    private String actorName;

    @Column(name = "changed_by")
    private UUID changedById;

    @Column(name = "changed_at")
    private LocalDateTime changedAt = LocalDateTime.now();

    public UUID getChangedById() {
        return this.actorId != null ? this.actorId : this.changedById;
    }

    public UUID getActorId() {
        return this.actorId;
    }

    public String getActorName() {
        return this.actorName;
    }
}