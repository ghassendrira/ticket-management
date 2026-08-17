package com.ticketmanagement.ticketservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "ai_analysis")
@Getter
@Setter
public class AIAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne
    @JoinColumn(name = "ticket_id", nullable = false, unique = true)
    private Ticket ticket;

    @Enumerated(EnumType.STRING)
    @Column(name = "predicted_category")
    private Category predictedCategory;

    private double confidence;

    @Column(columnDefinition = "TEXT")
    private String explanation;

    @Enumerated(EnumType.STRING)
    @Column(name = "predicted_priority")
    private Priority predictedPriority;

    private String sentiment;

    @ElementCollection
    @CollectionTable(name = "ai_similar_tickets", joinColumns = @JoinColumn(name = "ai_analysis_id"))
    @Column(name = "similar_ticket_id")
    private List<String> similarTickets;

    @Column(name = "suggested_response", columnDefinition = "TEXT")
    private String suggestedResponse;
}