package com.ticketmanagement.assignmentservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "teams")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Team {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    private String description;

    // ⬇️ Renommé pour matcher le code existant
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "team_specialties", joinColumns = @JoinColumn(name = "team_id"))
    @Column(name = "category")
    @Builder.Default
    private List<String> managedCategories = new ArrayList<>();

    @Column(name = "manager_id", nullable = false)
    private String managerId;

    @OneToMany(mappedBy = "team", fetch = FetchType.LAZY)
    @Builder.Default
    private List<AgentProfile> agents = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}