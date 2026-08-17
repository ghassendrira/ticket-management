package com.ticketmanagement.assignmentservice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "agent_skills", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"agent_profile_id", "skill_name"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgentSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_profile_id", nullable = false)
    private AgentProfile agentProfile;

    @Column(name = "skill_name", nullable = false)
    private String skillName;

    @Column(nullable = false)
    private Integer level;
}