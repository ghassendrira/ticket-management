package com.ticketmanagement.assignmentservice.dto;

import lombok.Data;

@Data
public class AgentSkillRequest {
    private String skillName;
    private int level;
}