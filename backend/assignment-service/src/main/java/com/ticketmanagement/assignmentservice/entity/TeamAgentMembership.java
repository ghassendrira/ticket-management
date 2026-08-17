package com.ticketmanagement.assignmentservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "team_agent_memberships", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"team_id", "agent_profile_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamAgentMembership {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "agent_profile_id", nullable = false)
    private AgentProfile agent;

    @CreationTimestamp
    @Column(name = "assigned_at", updatable = false)
    private LocalDateTime assignedAt;
}
