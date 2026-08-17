package com.ticketmanagement.assignmentservice.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class AssignmentRecommendationResponse {
    private UUID recommendedAgentId;
    private String userId;
    private String agentName;
    private int score;
    private List<ScoringFactor> factors;
    private List<AlternativeAgentResponse> alternatives;
}