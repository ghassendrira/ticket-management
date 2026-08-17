package com.ticketmanagement.assignmentservice.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class AgentProfileResponse {
    private UUID id;
    private String userId;
    private String fullName;      // ← Ajouté pour afficher le vrai nom de l'agent
    private String email;         // ← Ajouté pour stocker/transmettre l'email si besoin
    private UUID teamId;
    private String teamName;
    private Boolean isOnline;
    private Integer maxConcurrentTickets;
    private List<AgentSkillResponse> skills;
}