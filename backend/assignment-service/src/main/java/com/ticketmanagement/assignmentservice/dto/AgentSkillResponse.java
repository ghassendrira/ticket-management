package com.ticketmanagement.assignmentservice.dto;

import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder
public class AgentSkillResponse {
    private UUID id;
    private String skillName;
    private int level;
}