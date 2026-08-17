package com.ticketmanagement.assignmentservice.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class MyTeamResponse {
    private UUID teamId;
    private String teamName;
    private String managerId;
    private String managerName;
    private int agentCount;
}
