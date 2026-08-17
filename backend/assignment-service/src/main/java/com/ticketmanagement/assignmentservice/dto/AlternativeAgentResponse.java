package com.ticketmanagement.assignmentservice.dto;

import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder
public class AlternativeAgentResponse {
    private UUID agentId;
    private String userId;
    private String agentName;
    private int score;
}